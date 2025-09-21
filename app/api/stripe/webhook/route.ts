import { NextResponse } from "next/server";
import Stripe from "stripe";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe/server";
import { getStripeWebhookSecret } from "@/lib/env";
import { getServiceRoleSupabase } from "@/utils/supabase/service-role-client";
import type { PaymentLineItem, RentPaymentRow } from "@/lib/payments/types";

async function findRentPayment(
  supabase: SupabaseClient<Database>,
  identifiers: {
    id?: string;
    paymentIntentId?: string | null;
    invoiceId?: string | null;
    checkoutSessionId?: string | null;
  },
) {
  if (identifiers.id) {
    return supabase.from("rent_payments").select("*").eq("id", identifiers.id).maybeSingle();
  }

  if (identifiers.paymentIntentId) {
    return supabase
      .from("rent_payments")
      .select("*")
      .eq("stripe_payment_intent_id", identifiers.paymentIntentId)
      .maybeSingle();
  }

  if (identifiers.invoiceId) {
    return supabase
      .from("rent_payments")
      .select("*")
      .eq("stripe_invoice_id", identifiers.invoiceId)
      .maybeSingle();
  }

  if (identifiers.checkoutSessionId) {
    return supabase
      .from("rent_payments")
      .select("*")
      .eq("stripe_checkout_session_id", identifiers.checkoutSessionId)
      .maybeSingle();
  }

  return { data: null, error: null };
}

function formatInvoiceLineItems(invoice: Stripe.Invoice): PaymentLineItem[] {
  return invoice.lines.data.map((line) => ({
    description: line.description ?? line.plan?.nickname ?? "Rent invoice line item",
    quantity: line.quantity ?? undefined,
    unit_amount: line.price?.unit_amount ?? line.amount_excluding_tax ?? line.amount ?? undefined,
    total: line.amount ?? undefined,
    interval: line.plan?.interval ?? line.price?.recurring?.interval ?? null,
  }));
}

function createPaymentIntentLineItems(paymentIntent: Stripe.PaymentIntent): PaymentLineItem[] {
  return [
    {
      description: paymentIntent.description ?? "Rent payment",
      quantity: 1,
      unit_amount: paymentIntent.amount,
      total: paymentIntent.amount_received || paymentIntent.amount,
      interval: null,
    },
  ];
}

function secondsToISOString(seconds?: number | null): string | null {
  if (!seconds) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

async function upsertRentPaymentFromInvoice(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
): Promise<RentPaymentRow | null> {
  const customerId = invoice.customer?.toString();

  if (!customerId) {
    return null;
  }

  const customerLookup = await supabase
    .from("stripe_customers")
    .select("tenant_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customerLookup.error || !customerLookup.data) {
    return null;
  }

  const insertPayload = {
    tenant_id: customerLookup.data.tenant_id,
    stripe_customer_id: customerId,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent?.toString() ?? null,
    stripe_subscription_id: invoice.subscription?.toString() ?? null,
    amount_due_cents: invoice.amount_due,
    amount_paid_cents: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.paid ? "paid" : invoice.status ?? "pending",
    paid_at: secondsToISOString(invoice.status_transitions?.paid_at),
    receipt_url: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null,
    line_items: formatInvoiceLineItems(invoice),
    metadata: invoice.metadata as Record<string, unknown>,
    description: invoice.description ?? "Rent invoice",
    billing_period_start: secondsToISOString(invoice.lines.data[0]?.period?.start ?? undefined),
    billing_period_end: secondsToISOString(invoice.lines.data[0]?.period?.end ?? undefined),
    due_date: secondsToISOString(invoice.due_date),
  } satisfies Database["public"]["Tables"]["rent_payments"]["Insert"];

  const { data, error } = await supabase
    .from("rent_payments")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updateTenantAutopay(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  updates: Partial<Database["public"]["Tables"]["tenant_billing_metadata"]["Update"]>,
) {
  const { error } = await supabase
    .from("tenant_billing_metadata")
    .upsert({ tenant_id: tenantId, ...updates }, { onConflict: "tenant_id" });

  if (error) {
    throw new Error(error.message);
  }
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient<Database>,
  session: Stripe.Checkout.Session,
) {
  const rentPaymentId = session.metadata?.rent_payment_id;

  const lookup = await findRentPayment(supabase, {
    id: rentPaymentId,
    checkoutSessionId: rentPaymentId ? undefined : session.id,
  });

  if (lookup.error) {
    throw new Error(lookup.error.message);
  }

  if (!lookup.data) {
    return;
  }

  const updates: Database["public"]["Tables"]["rent_payments"]["Update"] = {
    stripe_payment_intent_id: session.payment_intent?.toString() ?? lookup.data.stripe_payment_intent_id,
    stripe_subscription_id: session.subscription?.toString() ?? lookup.data.stripe_subscription_id,
    stripe_invoice_id: session.invoice?.toString() ?? lookup.data.stripe_invoice_id,
    status: session.payment_status === "paid" ? "paid" : "processing",
  };

  const { error } = await supabase
    .from("rent_payments")
    .update(updates)
    .eq("id", lookup.data.id);

  if (error) {
    throw new Error(error.message);
  }

  if (session.subscription && lookup.data.tenant_id) {
    await updateTenantAutopay(supabase, lookup.data.tenant_id, {
      stripe_subscription_id: session.subscription.toString(),
      autopay_status: session.payment_status === "paid" ? "active" : "pending_activation",
    });
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
) {
  const lookup = await findRentPayment(supabase, {
    invoiceId: invoice.id,
    paymentIntentId: invoice.payment_intent?.toString() ?? undefined,
  });

  let rentPayment = lookup.data;

  if (lookup.error) {
    throw new Error(lookup.error.message);
  }

  if (!rentPayment) {
    rentPayment = await upsertRentPaymentFromInvoice(supabase, invoice);
  }

  if (!rentPayment) {
    return;
  }

  const updates: Database["public"]["Tables"]["rent_payments"]["Update"] = {
    amount_paid_cents: invoice.amount_paid,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent?.toString() ?? rentPayment.stripe_payment_intent_id,
    stripe_subscription_id: invoice.subscription?.toString() ?? rentPayment.stripe_subscription_id,
    status: "paid",
    paid_at: secondsToISOString(invoice.status_transitions?.paid_at) ?? new Date().toISOString(),
    receipt_url: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? rentPayment.receipt_url,
    line_items: formatInvoiceLineItems(invoice),
    metadata: { ...rentPayment.metadata, ...invoice.metadata },
  };

  const { error } = await supabase
    .from("rent_payments")
    .update(updates)
    .eq("id", rentPayment.id);

  if (error) {
    throw new Error(error.message);
  }

  if (rentPayment.tenant_id) {
    await updateTenantAutopay(supabase, rentPayment.tenant_id, {
      autopay_enabled: true,
      autopay_status: "active",
      stripe_subscription_id: invoice.subscription?.toString() ?? rentPayment.stripe_subscription_id,
      last_synced_at: new Date().toISOString(),
      default_payment_method_id: invoice.default_payment_method?.toString() ?? undefined,
      next_billing_date: secondsToISOString(invoice.next_payment_attempt),
    });
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
) {
  const lookup = await findRentPayment(supabase, {
    invoiceId: invoice.id,
    paymentIntentId: invoice.payment_intent?.toString() ?? undefined,
  });

  if (lookup.error || !lookup.data) {
    return;
  }

  const failure = invoice.last_payment_error;

  const updates: Database["public"]["Tables"]["rent_payments"]["Update"] = {
    status: "failed",
    failure_code: failure?.code ?? null,
    failure_message: failure?.message ?? null,
    metadata: { ...lookup.data.metadata, last_payment_error: failure?.message },
  };

  const { error } = await supabase
    .from("rent_payments")
    .update(updates)
    .eq("id", lookup.data.id);

  if (error) {
    throw new Error(error.message);
  }

  if (lookup.data.tenant_id) {
    await updateTenantAutopay(supabase, lookup.data.tenant_id, {
      autopay_status: "payment_failed",
      autopay_enabled: false,
      last_synced_at: new Date().toISOString(),
    });
  }
}

async function handlePaymentIntentSucceeded(
  supabase: SupabaseClient<Database>,
  paymentIntent: Stripe.PaymentIntent,
) {
  const lookup = await findRentPayment(supabase, {
    paymentIntentId: paymentIntent.id,
    checkoutSessionId: paymentIntent.metadata.checkout_session_id,
  });

  if (lookup.error) {
    throw new Error(lookup.error.message);
  }

  if (!lookup.data) {
    const customerId = paymentIntent.customer?.toString();

    if (!customerId) {
      return;
    }

    const customerLookup = await supabase
      .from("stripe_customers")
      .select("tenant_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (customerLookup.error || !customerLookup.data) {
      return;
    }

    const { data, error } = await supabase
      .from("rent_payments")
      .insert({
        tenant_id: customerLookup.data.tenant_id,
        stripe_customer_id: customerId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_due_cents: paymentIntent.amount,
        amount_paid_cents: paymentIntent.amount_received,
        currency: paymentIntent.currency,
        status: "paid",
        paid_at: new Date(paymentIntent.created * 1000).toISOString(),
        receipt_url: paymentIntent.charges.data[0]?.receipt_url ?? null,
        line_items: createPaymentIntentLineItems(paymentIntent),
        metadata: paymentIntent.metadata,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const charge = paymentIntent.charges.data[0];

  const updates: Database["public"]["Tables"]["rent_payments"]["Update"] = {
    amount_paid_cents: paymentIntent.amount_received,
    status: "paid",
    paid_at: new Date(paymentIntent.created * 1000).toISOString(),
    receipt_url: charge?.receipt_url ?? lookup.data.receipt_url,
    stripe_charge_id: charge?.id ?? lookup.data.stripe_charge_id,
    line_items: createPaymentIntentLineItems(paymentIntent),
    metadata: { ...lookup.data.metadata, ...paymentIntent.metadata },
  };

  const { error } = await supabase
    .from("rent_payments")
    .update(updates)
    .eq("id", lookup.data.id);

  if (error) {
    throw new Error(error.message);
  }
}

async function handlePaymentIntentFailed(
  supabase: SupabaseClient<Database>,
  paymentIntent: Stripe.PaymentIntent,
) {
  const lookup = await findRentPayment(supabase, { paymentIntentId: paymentIntent.id });

  if (lookup.error || !lookup.data) {
    return;
  }

  const failure = paymentIntent.last_payment_error;

  const updates: Database["public"]["Tables"]["rent_payments"]["Update"] = {
    status: "failed",
    failure_code: failure?.code ?? null,
    failure_message: failure?.message ?? null,
    metadata: { ...lookup.data.metadata, last_payment_error: failure?.message },
  };

  const { error } = await supabase
    .from("rent_payments")
    .update(updates)
    .eq("id", lookup.data.id);

  if (error) {
    throw new Error(error.message);
  }
}

export const webhookTestHelpers = {
  handleCheckoutSessionCompleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
};

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature header." }, { status: 400 });
  }

  const body = await request.text();

  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceRoleSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      case "customer.subscription.deleted":
        if (event.data.object && typeof event.data.object === "object") {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer?.toString();

          if (customerId) {
            const customerLookup = await supabase
              .from("stripe_customers")
              .select("tenant_id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();

            if (!customerLookup.error && customerLookup.data?.tenant_id) {
              await updateTenantAutopay(supabase, customerLookup.data.tenant_id, {
                autopay_enabled: false,
                autopay_status: "cancelled",
                stripe_subscription_id: null,
              });
            }
          }
        }
        break;
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
