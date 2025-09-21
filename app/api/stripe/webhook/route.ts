import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { Database } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type WebhookClients = {
  supabase: SupabaseClient<Database>;
  stripe: Stripe;
};

const toPlainMetadata = (metadata: Stripe.Metadata | undefined) => {
  const plain: Record<string, string> = {};

  if (!metadata) {
    return plain;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (value != null) {
      plain[key] = value;
    }
  }

  return plain;
};

const toDateOnly = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

async function mapCustomerToProfileId(
  supabase: SupabaseClient<Database>,
  customerId: string | null | undefined,
) {
  if (!customerId) {
    return null;
  }

  const { data } = await supabase
    .from("stripe_customers")
    .select("profile_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.profile_id ?? null;
}

async function upsertRentPayment(
  supabase: SupabaseClient<Database>,
  profileId: string,
  params: {
    paymentIntentId: string;
    amount: number;
    currency: string;
    status: string;
    receiptUrl?: string | null;
    invoiceId?: string | null;
    paidAt?: Date | null;
    metadata?: Record<string, string>;
    billingPeriodStart?: string | null;
    billingPeriodEnd?: string | null;
    checkoutSessionId?: string | null;
  },
) {
  const { data: existing } = await supabase
    .from("rent_payments")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", params.paymentIntentId)
    .maybeSingle();

  const mergedMetadata = {
    ...(existing?.metadata as Record<string, unknown> | null ?? {}),
    ...params.metadata,
  };

  if (existing?.id) {
    await supabase
      .from("rent_payments")
      .update({
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        receipt_url: params.receiptUrl ?? null,
        stripe_invoice_id: params.invoiceId ?? null,
        paid_at: params.paidAt ? params.paidAt.toISOString() : null,
        metadata: mergedMetadata,
        billing_period_start: params.billingPeriodStart ?? null,
        billing_period_end: params.billingPeriodEnd ?? null,
        stripe_checkout_session_id: params.checkoutSessionId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("rent_payments").insert({
      profile_id: profileId,
      stripe_payment_intent_id: params.paymentIntentId,
      stripe_invoice_id: params.invoiceId ?? null,
      stripe_checkout_session_id: params.checkoutSessionId ?? null,
      amount: params.amount,
      currency: params.currency,
      status: params.status,
      receipt_url: params.receiptUrl ?? null,
      paid_at: params.paidAt ? params.paidAt.toISOString() : null,
      metadata: params.metadata ?? {},
      billing_period_start: params.billingPeriodStart ?? null,
      billing_period_end: params.billingPeriodEnd ?? null,
    });
  }
}

async function updateBillingSettings(
  supabase: SupabaseClient<Database>,
  profileId: string,
  updates: Partial<Database["public"]["Tables"]["tenant_billing_settings"]["Update"]>,
) {
  const { metadata, ...rest } = updates;

  let mergedMetadata = metadata ?? undefined;

  if (metadata) {
    const { data: existing } = await supabase
      .from("tenant_billing_settings")
      .select("metadata")
      .eq("profile_id", profileId)
      .maybeSingle();

    mergedMetadata = {
      ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
      ...metadata,
    } as Record<string, unknown>;
  }

  await supabase
    .from("tenant_billing_settings")
    .upsert(
      {
        profile_id: profileId,
        updated_at: new Date().toISOString(),
        ...rest,
        metadata: mergedMetadata,
      },
      { onConflict: "profile_id" },
    );
}

export async function handleStripeEvent(event: Stripe.Event, clients?: Partial<WebhookClients>) {
  const supabase = clients?.supabase ?? getSupabaseServiceRoleClient();
  const stripe = clients?.stripe ?? getStripeClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const profileId = await mapCustomerToProfileId(supabase, customerId);

      if (!profileId) {
        break;
      }

      const metadata = toPlainMetadata(session.metadata as Stripe.Metadata | undefined);

      if (session.mode === "subscription") {
        await updateBillingSettings(supabase, profileId, {
          autopay_enabled: true,
          subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          autopay_payment_method: typeof session.payment_method === "string" ? session.payment_method : null,
          metadata,
        });
      } else if (session.mode === "payment") {
        await supabase
          .from("rent_payments")
          .update({
            status: "processing",
            metadata,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id);
      }

      break;
    }
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const customerId = typeof intent.customer === "string" ? intent.customer : null;
      const profileId = await mapCustomerToProfileId(supabase, customerId);

      if (!profileId) {
        break;
      }

      const amount = (intent.amount_received ?? intent.amount ?? 0) / 100;
      const currency = (intent.currency ?? "usd").toUpperCase();
      const receiptUrl = intent.charges?.data?.[0]?.receipt_url ?? null;
      const metadata = toPlainMetadata(intent.metadata);

      const billingPeriodStart = toDateOnly(metadata.billing_period_start);
      const billingPeriodEnd = toDateOnly(metadata.billing_period_end);

      await upsertRentPayment(supabase, profileId, {
        paymentIntentId: intent.id,
        amount,
        currency,
        status: "succeeded",
        receiptUrl,
        invoiceId: typeof intent.invoice === "string" ? intent.invoice : null,
        paidAt: new Date((intent.created ?? Math.floor(Date.now() / 1000)) * 1000),
        metadata,
        billingPeriodStart,
        billingPeriodEnd,
        checkoutSessionId: metadata.checkout_session_id ?? null,
      });

      if (metadata.checkout_mode === "subscription") {
        await updateBillingSettings(supabase, profileId, {
          autopay_enabled: true,
          last_autopay_at: new Date().toISOString(),
        });
      }

      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const customerId = typeof intent.customer === "string" ? intent.customer : null;
      const profileId = await mapCustomerToProfileId(supabase, customerId);

      if (!profileId) {
        break;
      }

      const metadata = toPlainMetadata(intent.metadata);

      await upsertRentPayment(supabase, profileId, {
        paymentIntentId: intent.id,
        amount: (intent.amount ?? 0) / 100,
        currency: (intent.currency ?? "usd").toUpperCase(),
        status: "failed",
        receiptUrl: intent.charges?.data?.[0]?.receipt_url ?? null,
        invoiceId: typeof intent.invoice === "string" ? intent.invoice : null,
        metadata: {
          ...metadata,
          failure_message: intent.last_payment_error?.message ?? "",
        },
      });

      if (metadata.checkout_mode === "subscription") {
        await updateBillingSettings(supabase, profileId, {
          autopay_enabled: false,
          metadata: {
            ...metadata,
            autopay_status: "failed",
          },
        });
      }

      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const profileId = await mapCustomerToProfileId(supabase, customerId);

      if (!profileId) {
        break;
      }

      const metadata = toPlainMetadata(invoice.metadata);

      await updateBillingSettings(supabase, profileId, {
        autopay_enabled: true,
        last_autopay_at: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString(),
        next_autopay_at: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period!.end * 1000).toISOString()
            : null,
        rent_amount: (invoice.amount_paid ?? 0) / 100,
        currency: (invoice.currency ?? "usd").toUpperCase(),
        metadata,
      });

      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const profileId = await mapCustomerToProfileId(supabase, customerId);

      if (!profileId) {
        break;
      }

      await updateBillingSettings(supabase, profileId, {
        autopay_enabled: false,
        metadata: {
          failure_reason: invoice.last_finalization_error?.message ?? "",
        },
      });

      break;
    }
    default: {
      console.info(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  return { handled: true };
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event, { stripe });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
