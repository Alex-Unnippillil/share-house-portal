import { headers } from "next/headers"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { jsonError } from "@/lib/errors"
import { sendEmailNotification, sendInAppNotification } from "@/lib/notifications"
import { createStructuredLogger, getCorrelationId } from "@/lib/observability/logger"
import { incrementOperationalMetric, recordWebhookDeliveryMetric } from "@/lib/observability/metrics"
import { isLikelyTransientError, RetryExhaustedError, retryWithBackoff } from "@/lib/resilience"
import { getStripe } from "@/lib/stripe"
import type { Database, Json, TablesInsert } from "@/lib/supabase"

class UnmappedPaymentEventError extends Error {
  eventId: string
  eventType: string
  auditDetail: Record<string, string | null>

  constructor(params: {
    eventId: string
    eventType: string
    reason: string
    auditDetail: Record<string, string | null>
  }) {
    super(params.reason)
    this.name = "UnmappedPaymentEventError"
    this.eventId = params.eventId
    this.eventType = params.eventType
    this.auditDetail = params.auditDetail
  }
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function lookupTenantFromStripeMappings(
  supabase: SupabaseClient<Database>,
  identifiers: { stripeSubscriptionId?: string | null; stripeCustomerId?: string | null }
) {
  if (identifiers.stripeSubscriptionId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", identifiers.stripeSubscriptionId)
      .maybeSingle()

    if (isUuid(data?.user_id)) {
      return data.user_id
    }
  }

  if (identifiers.stripeCustomerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", identifiers.stripeCustomerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (isUuid(data?.user_id)) {
      return data.user_id
    }
  }

  return null
}

async function resolveTenantId(
  supabase: SupabaseClient<Database>,
  options: {
    tenantIdFromMetadata?: string | null
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
  }
) {
  if (isUuid(options.tenantIdFromMetadata)) {
    return options.tenantIdFromMetadata
  }

  return lookupTenantFromStripeMappings(supabase, {
    stripeCustomerId: options.stripeCustomerId,
    stripeSubscriptionId: options.stripeSubscriptionId,
  })
}

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

function parseAmountInMajorUnits(amountInCents: number | null | undefined) {
  if (!amountInCents) {
    return 0
  }

  return amountInCents / 100
}

async function isDuplicateEvent(supabase: SupabaseClient<Database>, event: Stripe.Event) {
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

  if (error.code === "23505") {
    return true
  }

  throw error
}

async function markEventProcessed(
  supabase: SupabaseClient<Database>,
  eventId: string,
  status: "processed" | "failed" | "dead_lettered",
  options: { errorMessage?: string; retryCount?: number; maxRetries?: number } = {}
) {
  const now = new Date().toISOString()

  await supabase
    .from("webhook_events")
    .update({
      status,
      error_message: options.errorMessage,
      processed_at: now,
      retry_count: options.retryCount ?? 0,
      max_retries: options.maxRetries ?? 0,
      dead_lettered_at: status === "dead_lettered" ? now : null,
      last_attempt_at: now,
      next_retry_at: null,
    })
    .eq("provider", "stripe")
    .eq("event_id", eventId)
}

async function queueUnmappedPaymentEvent(
  supabase: SupabaseClient<Database>,
  params: {
    eventId: string
    eventType: string
    reason: string
    auditDetail: Record<string, string | null>
    correlationId: string
  }
) {
  const now = new Date().toISOString()

  await supabase
    .from("webhook_events")
    .update({
      status: "failed",
      error_message: params.reason,
      processed_at: now,
      last_attempt_at: now,
      payload: {
        reconciliation: {
          actionable: true,
          triage_status: "open",
          triage_notes: "",
          queue_reason: "unmapped_payment_event",
          webhook_event_type: params.eventType,
          queued_at: now,
          correlation_id: params.correlationId,
          ...params.auditDetail,
        },
      },
    })
    .eq("provider", "stripe")
    .eq("event_id", params.eventId)
}

async function upsertRentPayment(
  supabase: SupabaseClient<Database>,
  payment: TablesInsert<"rent_payments">
) {
  const isOneTime = Boolean(payment.stripe_payment_intent_id)

  if (isOneTime && payment.stripe_payment_intent_id) {
    await supabase.from("rent_payments").upsert(payment, { onConflict: "stripe_payment_intent_id" })
    return
  }

  if (payment.stripe_subscription_id && payment.metadata) {
    const invoiceId =
      typeof payment.metadata === "object" && payment.metadata && "invoice_id" in payment.metadata
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
  }

  await supabase.from("rent_payments").insert(payment)
}

async function notifyTenantPayment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  amount: number,
  description: string | null
) {
  try {
    const { data: tenantProfile } = await supabase.from("profiles").select("full_name, email").eq("id", tenantId).single()

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
  session: Stripe.Checkout.Session,
  event: Stripe.Event
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

  const tenantId = await resolveTenantId(supabase, {
    tenantIdFromMetadata: fullSession.metadata?.tenant_id,
    stripeCustomerId: typeof fullSession.customer === "string" ? fullSession.customer : null,
  })
  const unitId = fullSession.metadata?.unit_id
  const paymentStatus = fullSession.payment_status ?? session.payment_status
  const amount = parseAmountInMajorUnits(lineItem?.amount_total ?? fullSession.amount_total)

  if (!tenantId) {
    throw new UnmappedPaymentEventError({
      eventId: event.id,
      eventType: event.type,
      reason: "Unable to map checkout session payment to tenant.",
      auditDetail: {
        stripe_customer_id: typeof fullSession.customer === "string" ? fullSession.customer : null,
        stripe_subscription_id: null,
        metadata_tenant_id: fullSession.metadata?.tenant_id ?? null,
        session_id: fullSession.id,
      },
    })
  }

  const paymentData: TablesInsert<"rent_payments"> = {
    user_id: tenantId,
    stripe_payment_intent_id: paymentIntentId,
    stripe_customer_id: typeof fullSession.customer === "string" ? fullSession.customer : null,
    amount,
    currency: (lineItem?.currency || fullSession.currency || "usd").toUpperCase(),
    description: lineItem?.description || "One-time rent payment",
    status: paymentStatus === "paid" ? "succeeded" : "pending",
    processed_at: new Date().toISOString(),
    receipt_url: null,
    tenant_id: tenantId,
    unit_id: unitId,
    payment_method_type: "card",
    metadata: {
      session_id: fullSession.id,
      payment_status: paymentStatus,
      line_item_price: lineItem?.price?.id,
    },
  }

  await upsertRentPayment(supabase, paymentData)

  if (tenantId && paymentData.status === "succeeded") {
    await notifyTenantPayment(supabase, tenantId, amount, paymentData.description ?? null)
  }
}

function normalizeSubscriptionStatus(
  status: Stripe.Subscription.Status
): TablesInsert<"subscriptions">["status"] {
  if (status === "active" || status === "canceled" || status === "past_due" || status === "unpaid") {
    return status
  }

  return "past_due"
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
  event: Stripe.Event
) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id

  if (!subscriptionId) {
    return
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const tenantId = await resolveTenantId(supabase, {
    tenantIdFromMetadata: subscription.metadata?.tenant_id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : null,
  })
  const unitId = subscription.metadata?.unit_id
  const amount = parseAmountInMajorUnits(invoice.amount_paid)

  if (!tenantId) {
    throw new UnmappedPaymentEventError({
      eventId: event.id,
      eventType: event.type,
      reason: "Unable to map recurring payment success to tenant.",
      auditDetail: {
        stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
        stripe_subscription_id: subscription.id,
        metadata_tenant_id: subscription.metadata?.tenant_id ?? null,
        invoice_id: invoice.id,
      },
    })
  }

  const paymentData: TablesInsert<"rent_payments"> = {
    user_id: tenantId,
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
      : null,
    billing_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
      : null,
    metadata: {
      invoice_id: invoice.id,
      subscription_id: subscription.id,
      billing_reason: invoice.billing_reason,
    },
  }

  await upsertRentPayment(supabase, paymentData)

  await supabase
    .from("subscriptions")
    .update({
      status: normalizeSubscriptionStatus(subscription.status),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)

  if (tenantId) {
    await notifyTenantPayment(supabase, tenantId, amount, paymentData.description ?? null)
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
  event: Stripe.Event
) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id

  if (!subscriptionId) {
    return
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const tenantId = await resolveTenantId(supabase, {
    tenantIdFromMetadata: subscription.metadata?.tenant_id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : null,
  })

  if (!tenantId) {
    throw new UnmappedPaymentEventError({
      eventId: event.id,
      eventType: event.type,
      reason: "Unable to map recurring payment failure to tenant.",
      auditDetail: {
        stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
        stripe_subscription_id: subscription.id,
        metadata_tenant_id: subscription.metadata?.tenant_id ?? null,
        invoice_id: invoice.id,
      },
    })
  }

  const failedPayment: TablesInsert<"rent_payments"> = {
    user_id: tenantId,
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

async function handleSubscriptionCreated(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription
) {
  const tenantId = await resolveTenantId(supabase, {
    tenantIdFromMetadata: subscription.metadata?.tenant_id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
  })

  if (!tenantId) {
    return
  }

  await supabase.from("subscriptions").upsert({
    user_id: tenantId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    status: normalizeSubscriptionStatus(subscription.status),
    current_period_start: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    amount: parseAmountInMajorUnits(subscription.items.data[0]?.price?.unit_amount ?? 0),
    currency: (subscription.currency || "usd").toUpperCase(),
    interval: (subscription.items.data[0]?.price.recurring?.interval || "month") as "month" | "year",
    metadata: subscription.metadata,
  })
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription
) {
  await supabase
    .from("subscriptions")
    .update({
      status: normalizeSubscriptionStatus(subscription.status),
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
    })
    .eq("stripe_subscription_id", subscription.id)
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription
) {
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      current_period_end: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : new Date().toISOString(),
      metadata: subscription.metadata,
    })
    .eq("stripe_subscription_id", subscription.id)
}

function recordStripePaymentMetric(outcome: "success" | "failure", eventType: string, correlationId: string) {
  incrementOperationalMetric("payment_attempts_total", {
    source: "stripe_webhook",
    provider: "stripe",
    eventType,
    correlationId,
  })

  if (outcome === "success") {
    incrementOperationalMetric("payment_success_total", {
      source: "stripe_webhook",
      provider: "stripe",
      eventType,
      correlationId,
    })
    return
  }

  incrementOperationalMetric("payment_failures_total", {
    source: "stripe_webhook",
    provider: "stripe",
    eventType,
    correlationId,
    severity: "critical",
  })
}

async function processStripeEvent(supabase: SupabaseClient<Database>, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session, event)
      break
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice, event)
      break
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice, event)
      break
    case "customer.subscription.created":
      await handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription)
      break
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
      break
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
      break
    default:
      break
  }
}

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

export async function POST(req: Request) {
  const requestStartedAt = Date.now()
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const correlationId = getCorrelationId(req.headers, requestId)
  const logger = createStructuredLogger("webhook_processor", {
    component: "stripe_webhook",
    requestId,
    correlationId,
  })

  logger.info("stripe_webhook_request_received", {
    lifecyclePhase: "webhook.received",
  })

  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error("stripe_webhook_configuration_error", {
      reason: "missing_webhook_secret",
    })

    return jsonError("CONFIGURATION_ERROR", {
      message: "Stripe webhook secret is not configured",
    })
  }

  if (!signature) {
    logger.error("stripe_webhook_configuration_error", {
      reason: "missing_signature",
    })

    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "Missing stripe-signature header",
    })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    logger.error("stripe_webhook_configuration_error", {
      reason: "missing_supabase_admin_client",
    })

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

    logger.error("stripe_webhook_signature_verification_failed", {
      reason: message,
      provider: "stripe",
    })

    incrementOperationalMetric("webhook_failures_total", {
      source: "stripe_webhook",
      provider: "stripe",
      eventType: "unknown",
      reason: "stripe_signature_verification_failed",
      correlationId,
      severity: "critical",
    })
    recordWebhookDeliveryMetric({
      outcome: "failure",
      latencyMs: Date.now() - requestStartedAt,
      tags: {
        source: "stripe_webhook",
        provider: "stripe",
        eventType: "unknown",
        reason: "stripe_signature_verification_failed",
        correlationId,
        severity: "critical",
      },
    })

    return jsonError("REQUEST_VALIDATION_ERROR", {
      message,
      details: { reason: "stripe_signature_verification_failed" },
    })
  }

  try {
    const duplicate = await isDuplicateEvent(supabase, event)
    if (duplicate) {
      recordWebhookDeliveryMetric({
        outcome: "success",
        latencyMs: Date.now() - requestStartedAt,
        tags: {
          source: "stripe_webhook",
          provider: "stripe",
          eventType: event.type,
          correlationId,
          reason: "duplicate_event",
        },
      })
      return new Response("ok", { status: 200 })
    }

    logger.info("stripe_webhook_received", {
      eventName: event.type,
      stripeEventId: event.id,
      lifecyclePhase: "webhook.received",
    })

    const maxRetries = 3

    if (!HANDLED_EVENTS.has(event.type)) {
      logger.info("stripe_webhook_unhandled_event", { eventName: event.type })
      await markEventProcessed(supabase, event.id, "processed", { maxRetries })
    } else {
      const result = await retryWithBackoff(
        async () => {
          await processStripeEvent(supabase, event)
        },
        {
          retries: maxRetries,
          initialDelayMs: 350,
          maxDelayMs: 4_000,
          jitter: true,
          shouldRetry: (error) => isLikelyTransientError(error),
        }
      )

      if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
        recordStripePaymentMetric("success", event.type, correlationId)
      }

      if (event.type === "invoice.payment_failed") {
        recordStripePaymentMetric("failure", event.type, correlationId)
      }

      await markEventProcessed(supabase, event.id, "processed", {
        retryCount: Math.max(result.attempts - 1, 0),
        maxRetries,
      })
    }

    logger.info("stripe_webhook_processed", {
      eventName: event.type,
      stripeEventId: event.id,
      lifecyclePhase: "webhook.processed",
    })
    recordWebhookDeliveryMetric({
      outcome: "success",
      latencyMs: Date.now() - requestStartedAt,
      tags: {
        source: "stripe_webhook",
        provider: "stripe",
        eventType: event.type,
        correlationId,
      },
    })

    return new Response("ok", {
      status: 200,
      headers: { "x-correlation-id": correlationId },
    })
  } catch (err) {
    if (err instanceof UnmappedPaymentEventError) {
      logger.warn("stripe_webhook_unmapped_payment_event", {
        eventName: err.eventType,
        stripeEventId: err.eventId,
        lifecyclePhase: "webhook.reconciliation_queue",
        ...err.auditDetail,
      })

      incrementOperationalMetric("unmapped_payment_events_total", {
        source: "stripe_webhook",
        provider: "stripe",
        eventType: err.eventType,
        reason: "tenant_mapping_missing",
        correlationId,
        severity: "warning",
      })

      await queueUnmappedPaymentEvent(supabase, {
        eventId: err.eventId,
        eventType: err.eventType,
        reason: err.message,
        auditDetail: err.auditDetail,
        correlationId,
      })
      recordWebhookDeliveryMetric({
        outcome: "failure",
        latencyMs: Date.now() - requestStartedAt,
        tags: {
          source: "stripe_webhook",
          provider: "stripe",
          eventType: err.eventType,
          correlationId,
          reason: "tenant_mapping_missing",
          severity: "warning",
        },
      })

      return new Response("ok", {
        status: 200,
        headers: { "x-correlation-id": correlationId },
      })
    }

    const message = err instanceof Error ? err.message : "Unexpected webhook processing error"
    const exhausted = err instanceof RetryExhaustedError

    logger.error("stripe_webhook_processing_failed", {
      reason: message,
      provider: "stripe",
      eventName: event.type,
      stripeEventId: event.id,
      lifecyclePhase: "webhook.failed",
      exhausted,
    })

    incrementOperationalMetric("webhook_failures_total", {
      source: "stripe_webhook",
      provider: "stripe",
      eventType: event.type,
      reason: message,
      correlationId,
      severity: "critical",
    })
    recordWebhookDeliveryMetric({
      outcome: "failure",
      latencyMs: Date.now() - requestStartedAt,
      tags: {
        source: "stripe_webhook",
        provider: "stripe",
        eventType: event.type,
        reason: message,
        correlationId,
        severity: "critical",
      },
    })

    if (exhausted) {
      await markEventProcessed(supabase, event.id, "dead_lettered", {
        errorMessage: message,
        retryCount: Math.max(err.attempts - 1, 0),
        maxRetries: 3,
      })

      return jsonError("UPSTREAM_SERVICE_ERROR", {
        message: "Stripe webhook processing exhausted retries and was moved to dead-letter.",
        details: { eventId: event.id, eventType: event.type },
      })
    }

    await markEventProcessed(supabase, event.id, "failed", {
      errorMessage: message,
      retryCount: 0,
      maxRetries: 3,
    })

    return jsonError("INTERNAL_SERVER_ERROR", {
      message,
      details: { eventId: event.id, eventType: event.type },
    })
  }
}

export const runtime = "nodejs"
