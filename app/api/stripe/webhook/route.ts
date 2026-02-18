import { headers } from "next/headers"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import {
  sendEmailNotification,
  sendInAppNotification,
} from "@/lib/notifications"
import { jsonError } from "@/lib/errors"
import { createStructuredLogger } from "@/lib/observability/logger"
import { incrementOperationalMetric } from "@/lib/observability/metrics"
import { getStripe } from "@/lib/stripe"
import type { Database, Json, TablesInsert } from "@/lib/supabase"

function createSupabaseAdminClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase admin credentials are not configured")
    return null
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const logger = createStructuredLogger("webhook_processor", {
    component: "stripe_webhook",
    requestId,
  })

  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error("stripe_webhook_configuration_error", {
      reason: "missing_webhook_secret",
    })
    incrementOperationalMetric("webhook_failures_total", {
      source: "stripe_webhook",
      provider: "stripe",
      eventType: "unknown",
      reason: "missing_webhook_secret",
    })

    return jsonError("CONFIGURATION_ERROR", {
      message: "Stripe webhook secret is not configured",
    })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    logger.error("stripe_webhook_configuration_error", {
      reason: "missing_supabase_admin_client",
    })
    incrementOperationalMetric("webhook_failures_total", {
      source: "stripe_webhook",
      provider: "stripe",
      eventType: "unknown",
      reason: "missing_supabase_admin_client",
    })

    return jsonError("CONFIGURATION_ERROR", {
      message: "Supabase client not configured",
    })
function parseAmountInMajorUnits(amountInCents: number | null | undefined) {
  if (!amountInCents) {
    return 0
  }

  return amountInCents / 100
}

async function isDuplicateEvent(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event
) {
  const payload: TablesInsert<"webhook_events"> = {
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    status: "processing",
    payload: event as unknown as Json,
    processed_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("webhook_events").insert(payload)

  if (!error) {
    return false
  }

    logger.info("stripe_webhook_received", {
      eventName: event.type,
      stripeEventId: event.id,
    })

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, event.data.object)
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event.data.object)
        break
      case "customer.subscription.created":
        await handleSubscriptionCreated(supabase, event.data.object)
        break
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object)
        break
      default:
        logger.info("stripe_webhook_unhandled_event", {
          eventName: event.type,
        })
        break
    }

    logger.info("stripe_webhook_processed", {
      eventName: event.type,
      stripeEventId: event.id,
    })

    return new Response("ok", { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload"
    logger.error("stripe_webhook_processing_failed", {
      reason: message,
      provider: "stripe",
    })
    incrementOperationalMetric("webhook_failures_total", {
      source: "stripe_webhook",
      provider: "stripe",
      eventType: "unknown",
      reason: message,
    })
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes("signature")) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message,
        details: { reason: "stripe_signature_verification_failed" },
      })
    }
  if (error.code === "23505") {
    return true
  }

  throw error
}

async function markEventProcessed(
  supabase: SupabaseClient<Database>,
  eventId: string,
  status: "processed" | "failed",
  errorMessage?: string
) {
  await supabase
    .from("webhook_events")
    .update({
      status,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("provider", "stripe")
    .eq("event_id", eventId)
}

async function upsertRentPayment(
  supabase: SupabaseClient<Database>,
  payment: TablesInsert<"rent_payments">
) {
  const isOneTime = Boolean(payment.stripe_payment_intent_id)

  if (isOneTime && payment.stripe_payment_intent_id) {
    await supabase
      .from("rent_payments")
      .upsert(payment, { onConflict: "stripe_payment_intent_id" })
  } else if (payment.stripe_subscription_id && payment.metadata) {
    const invoiceId =
      typeof payment.metadata === "object" &&
      payment.metadata &&
      "invoice_id" in payment.metadata
        ? String((payment.metadata as Record<string, unknown>).invoice_id)
        : null

    if (invoiceId) {
      const { data: existing } = await supabase
        .from("rent_payments")
        .select("id")
        .contains("metadata", { invoice_id: invoiceId })
        .maybeSingle()

      if (existing?.id) {
        await supabase.from("rent_payments").update(payment).eq("id", existing.id)
        return
      }
    }

    await supabase.from("rent_payments").insert(payment)
  } else {
    await supabase.from("rent_payments").insert(payment)
  }
}

async function notifyTenantPayment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  amount: number,
  description: string | null
) {
  try {
    const { data: tenantProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", tenantId)
      .single()

    if (!tenantProfile?.email) {
      return
    }

    const readableAmount = `$${amount.toFixed(2)}`

    await sendEmailNotification({
      to: tenantProfile.email,
      subject: `Payment Receipt - ${readableAmount}`,
      template: "payment-receipt",
      data: {
        tenantName: tenantProfile.full_name || tenantProfile.email,
        amount: readableAmount,
        description: description ?? "Rent payment",
        date: new Date().toLocaleDateString(),
      },
      userId: tenantId,
    })

    await sendInAppNotification({
      userId: tenantId,
      title: "Payment update",
      message: `Your payment of ${readableAmount} is now recorded in your receipts.`,
      type: "success",
      actionUrl: "/payments",
    })
  } catch (notificationError) {
    console.error("Failed to send payment notification:", notificationError)
  }
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient<Database>,
  session: Stripe.Checkout.Session
) {
  const stripe = getStripe()
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items", "payment_intent"],
  })

  if (fullSession.mode !== "payment") {
    return
  }

  const lineItem = fullSession.line_items?.data[0]
  const paymentIntentId =
    typeof fullSession.payment_intent === "string"
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id

  const tenantId = fullSession.metadata?.tenant_id
  const unitId = fullSession.metadata?.unit_id

  const amount = parseAmountInMajorUnits(lineItem?.amount_total ?? fullSession.amount_total)
  const paymentData: TablesInsert<"rent_payments"> = {
    user_id: tenantId || "00000000-0000-0000-0000-000000000000",
    stripe_payment_intent_id: paymentIntentId,
    stripe_customer_id: typeof fullSession.customer === "string" ? fullSession.customer : null,
    amount,
    currency: (lineItem?.currency || fullSession.currency || "usd").toUpperCase(),
    description: lineItem?.description || "One-time rent payment",
    status: fullSession.payment_status === "paid" ? "succeeded" : "pending",
    processed_at: new Date().toISOString(),
    receipt_url: null,
    tenant_id: tenantId,
    unit_id: unitId,
    payment_method_type: "card",
    metadata: {
      session_id: fullSession.id,
      payment_status: fullSession.payment_status,
      line_item_price: lineItem?.price?.id,
    },
  }

  await upsertRentPayment(supabase, paymentData)

  if (tenantId && paymentData.status === "succeeded") {
    await notifyTenantPayment(
      supabase,
      tenantId,
      amount,
      paymentData.description ?? null
    )
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice
) {
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id

  if (!subscriptionId) {
    return
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const tenantId = subscription.metadata?.tenant_id
  const unitId = subscription.metadata?.unit_id
  const amount = parseAmountInMajorUnits(invoice.amount_paid)

  const subscriptionPayment: TablesInsert<"rent_payments"> = {
    user_id: tenantId || "00000000-0000-0000-0000-000000000000",
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
    stripe_subscription_id: subscription.id,
    amount,
    currency: (invoice.currency || "usd").toUpperCase(),
    description: `Recurring rent payment - ${subscription.metadata?.unit_label || "Unit"}`,
    status: "succeeded",
    processed_at: new Date().toISOString(),
    receipt_url: invoice.hosted_invoice_url,
    tenant_id: tenantId,
    unit_id: unitId,
    payment_method_type: "card",
    billing_period_start: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString().split("T")[0]
      : undefined,
    billing_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
      : undefined,
    metadata: {
      invoice_id: invoice.id,
      subscription_id: subscription.id,
      billing_reason: invoice.billing_reason,
    },
  }

  await upsertRentPayment(supabase, subscriptionPayment)

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)

  if (tenantId) {
    await notifyTenantPayment(supabase, tenantId, amount, subscriptionPayment.description)
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice
) {
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id

  if (!subscriptionId) {
    return
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const tenantId = subscription.metadata?.tenant_id

  const failedPayment: TablesInsert<"rent_payments"> = {
    user_id: tenantId || "00000000-0000-0000-0000-000000000000",
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
    stripe_subscription_id: subscription.id,
    amount: parseAmountInMajorUnits(invoice.amount_due),
    currency: (invoice.currency || "usd").toUpperCase(),
    description: `Failed recurring payment - ${subscription.metadata?.unit_label || "Unit"}`,
    status: "failed",
    processed_at: new Date().toISOString(),
    receipt_url: invoice.hosted_invoice_url,
    tenant_id: tenantId,
    unit_id: subscription.metadata?.unit_id,
    payment_method_type: "card",
    metadata: {
      invoice_id: invoice.id,
      subscription_id: subscription.id,
      failure_message: invoice.last_finalization_error?.message,
    },
  }

  await upsertRentPayment(supabase, failedPayment)
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return jsonError("CONFIGURATION_ERROR", {
      message: "Stripe webhook secret is not configured",
    })
  }

  if (!signature) {
    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "Missing stripe-signature header",
    })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return jsonError("CONFIGURATION_ERROR", {
      message: "Supabase client not configured",
    })
  }

  const rawBody = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload"
    console.error("Webhook signature verification failed:", message)

    return jsonError("REQUEST_VALIDATION_ERROR", {
      message,
      details: { reason: "stripe_signature_verification_failed" },
    })
  }

  try {
    const duplicate = await isDuplicateEvent(supabase, event)

    if (duplicate) {
      return new Response("ok", { status: 200 })
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice)
        break
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
        break
    }

    await markEventProcessed(supabase, event.id, "processed")

    return new Response("ok", { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected webhook processing error"
    console.error("Webhook processing error:", message)

    await markEventProcessed(supabase, event.id, "failed", message)

    return jsonError("INTERNAL_SERVER_ERROR", { message })
  }
}

export const runtime = "nodejs"
