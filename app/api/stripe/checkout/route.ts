import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type Stripe from "stripe";

import type { Database } from "@/lib/supabase";
import { getAppUrl } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/server";
import { ensureStripeCustomer } from "@/lib/payments/customer";
import type { PaymentLineItem } from "@/lib/payments/types";

const metadataSchema = z.record(z.string(), z.string());

const recurringSchema = z.object({
  interval: z.enum(["day", "week", "month", "year"]),
  intervalCount: z.number().int().positive().max(12).optional(),
});

const lineItemSchema = z.object({
  priceId: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().min(3).max(10).optional(),
  description: z.string().min(1).optional(),
  recurring: recurringSchema.optional(),
});

const checkoutPayloadSchema = z
  .object({
    mode: z.enum(["payment", "subscription"]),
    tenantId: z.string().uuid().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    amount: z.number().int().positive().optional(),
    currency: z.string().min(3).max(10).optional(),
    lineItems: z.array(lineItemSchema).optional(),
    metadata: metadataSchema.optional(),
    rentPaymentId: z.string().uuid().optional(),
    allowPromotionCodes: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.lineItems?.length && !value.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either an amount or one or more line items.",
        path: ["lineItems"],
      });
    }
  });

function normaliseLineItems(
  items: z.infer<typeof lineItemSchema>[] | undefined,
  fallbackCurrency: string,
): {
  stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  supabaseLineItems: PaymentLineItem[];
  estimatedTotalCents: number;
} {
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const supabaseLineItems: PaymentLineItem[] = [];

  let runningTotal = 0;

  if (!items?.length) {
    return { stripeLineItems, supabaseLineItems, estimatedTotalCents: runningTotal };
  }

  for (const item of items) {
    const quantity = item.quantity ?? 1;

    if (item.priceId) {
      stripeLineItems.push({ price: item.priceId, quantity });
      supabaseLineItems.push({
        description: item.description ?? "Stripe price",
        quantity,
        unit_amount: null,
        total: null,
      });
      continue;
    }

    const unitAmount = item.amount;

    if (!unitAmount) {
      throw new Error("Line items without a priceId must include an amount in cents.");
    }

    const currency = (item.currency ?? fallbackCurrency).toLowerCase();
    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency,
      unit_amount: unitAmount,
      product_data: {
        name: item.description ?? "Rent payment",
      },
    };

    if (item.recurring) {
      priceData.recurring = {
        interval: item.recurring.interval,
        interval_count: item.recurring.intervalCount,
      };
    }

    stripeLineItems.push({
      quantity,
      price_data: priceData,
    });

    runningTotal += unitAmount * quantity;
    supabaseLineItems.push({
      description: item.description ?? "Rent payment",
      quantity,
      unit_amount: unitAmount,
      total: unitAmount * quantity,
      interval: item.recurring?.interval ?? null,
    });
  }

  return { stripeLineItems, supabaseLineItems, estimatedTotalCents: runningTotal };
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to start checkout." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = checkoutPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const stripe = getStripeClient();
  const data = parsed.data;

  const requesterProfile = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (requesterProfile.error) {
    return NextResponse.json({ error: requesterProfile.error.message }, { status: 500 });
  }

  const tenantId = data.tenantId ?? user.id;
  const requesterRole = requesterProfile.data?.role ?? "user";

  if (tenantId !== user.id && !["property_manager", "admin"].includes(requesterRole)) {
    return NextResponse.json({ error: "You are not allowed to manage this tenant's billing." }, { status: 403 });
  }

  const tenantProfile = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantProfile.error) {
    return NextResponse.json({ error: tenantProfile.error.message }, { status: 500 });
  }

  if (!tenantProfile.data) {
    return NextResponse.json({ error: "Tenant profile not found." }, { status: 404 });
  }

  const billingMetadata = await supabase
    .from("tenant_billing_metadata")
    .select("currency, monthly_rent_cents, next_billing_date, metadata")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (billingMetadata.error) {
    return NextResponse.json({ error: billingMetadata.error.message }, { status: 500 });
  }

  const currency = (data.currency ?? billingMetadata.data?.currency ?? "usd").toLowerCase();

  let amountCents = data.amount ?? billingMetadata.data?.monthly_rent_cents ?? 0;

  const normalisedLineItems = normaliseLineItems(data.lineItems, currency);

  if (normalisedLineItems.estimatedTotalCents > 0) {
    amountCents = normalisedLineItems.estimatedTotalCents;
  }

  if (data.mode === "payment" && amountCents <= 0) {
    return NextResponse.json({ error: "A positive amount is required for one-time payments." }, { status: 400 });
  }

  let stripeCustomerId: string;

  try {
    const ensured = await ensureStripeCustomer({
      supabase,
      stripe,
      tenantId,
      email: tenantProfile.data.email ?? requesterProfile.data?.email ?? user.email ?? undefined,
      name: tenantProfile.data.full_name ?? undefined,
    });
    stripeCustomerId = ensured.customerId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Stripe customer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const metadata = {
    tenant_id: tenantId,
    created_by_user_id: user.id,
    checkout_mode: data.mode,
    ...(data.metadata ?? {}),
  } satisfies Record<string, string>;

  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData | undefined =
    data.mode === "payment"
      ? {
          metadata,
        }
      : undefined;

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined =
    data.mode === "subscription"
      ? {
          metadata,
        }
      : undefined;

  const successUrl = data.successUrl ?? `${getAppUrl()}/dashboard/payments?checkout=success`;
  const cancelUrl = data.cancelUrl ?? `${getAppUrl()}/dashboard/payments?checkout=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: data.mode,
    customer: stripeCustomerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: data.allowPromotionCodes,
    line_items: normalisedLineItems.stripeLineItems.length
      ? normalisedLineItems.stripeLineItems
      : undefined,
    payment_intent_data: paymentIntentData,
    subscription_data: subscriptionData,
    metadata,
  });

  let rentPaymentId = data.rentPaymentId;

  const rentPaymentPayload = {
    tenant_id: tenantId,
    stripe_customer_id: stripeCustomerId,
    stripe_checkout_session_id: session.id,
    stripe_invoice_id: session.invoice?.toString() ?? null,
    stripe_subscription_id: session.subscription?.toString() ?? null,
    amount_due_cents: amountCents,
    currency,
    status: "pending" as const,
    description: data.mode === "subscription" ? "Recurring rent payment" : "Rent payment",
    line_items: normalisedLineItems.supabaseLineItems,
    metadata: {
      ...(billingMetadata.data?.metadata ?? {}),
      ...(data.metadata ?? {}),
      checkout_session_id: session.id,
    },
    due_date: billingMetadata.data?.next_billing_date ?? null,
    billing_period_start: billingMetadata.data?.next_billing_date ?? null,
    billing_period_end: null,
  } satisfies Partial<Database["public"]["Tables"]["rent_payments"]["Insert"]>;

  if (rentPaymentId) {
    const { error: updateError } = await supabase
      .from("rent_payments")
      .update(rentPaymentPayload)
      .eq("id", rentPaymentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("rent_payments")
      .insert(rentPaymentPayload)
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    rentPaymentId = inserted?.id ?? undefined;
  }

  if (data.mode === "subscription") {
    const upsertPayload = {
      tenant_id: tenantId,
      currency,
      monthly_rent_cents: amountCents > 0 ? amountCents : billingMetadata.data?.monthly_rent_cents ?? null,
      autopay_status: "pending_activation",
      autopay_enabled: false,
      metadata: {
        ...(billingMetadata.data?.metadata ?? {}),
        pending_checkout_session_id: session.id,
      },
    } satisfies Partial<Database["public"]["Tables"]["tenant_billing_metadata"]["Insert"]>;

    const { error: upsertError } = await supabase
      .from("tenant_billing_metadata")
      .upsert(upsertPayload, { onConflict: "tenant_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    url: session.url,
    checkoutSessionId: session.id,
    rentPaymentId,
    customerId: stripeCustomerId,
  });
}
