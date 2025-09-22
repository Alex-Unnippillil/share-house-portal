import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { sendEmailNotification, sendInAppNotification } from "@/lib/notifications"
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase"

export type RentPaymentStatus = Tables<'rent_payments'>['status']
export type SubscriptionStatus = Tables<'subscriptions'>['status']
export type StripeWebhookEventRow = Tables<'stripe_webhook_events'>
export type StripeWebhookEventStatus = StripeWebhookEventRow['status']

const PAYMENT_STATUS_MAP: Record<string, RentPaymentStatus> = {
  succeeded: "succeeded",
  paid: "succeeded",
  completed: "succeeded",
  captured: "succeeded",
  processing: "pending",
  pending: "pending",
  requires_action: "pending",
  requires_capture: "pending",
  requires_confirmation: "pending",
  requires_payment_method: "pending",
  open: "pending",
  draft: "pending",
  past_due: "pending",
  unpaid: "failed",
  failed: "failed",
  declined: "failed",
  uncollectible: "failed",
  void: "cancelled",
  canceled: "cancelled",
  cancelled: "cancelled",
  no_payment_required: "succeeded",
  incomplete: "pending",
  incomplete_expired: "cancelled",
}

const SUBSCRIPTION_STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "active",
  active: "active",
  past_due: "past_due",
  unpaid: "unpaid",
  paused: "past_due",
  canceled: "canceled",
  cancelled: "canceled",
  incomplete: "past_due",
  incomplete_expired: "canceled",
}

function toIsoTimestamp(timestamp: number | null | undefined): string | null {
  if (!timestamp) {
    return null
  }

  return new Date(timestamp * 1000).toISOString()
}

function buildMetadata(
  existing: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>
) {
  return { ...(existing ?? {}), ...updates }
}

export function normalizeRentPaymentStatus(
  status?: string | null
): RentPaymentStatus {
  if (!status) {
    return "pending"
  }

  const normalized = PAYMENT_STATUS_MAP[status.toLowerCase()]
  return normalized ?? "pending"
}

export function normalizeSubscriptionStatus(
  status?: string | null
): SubscriptionStatus {
  if (!status) {
    return "active"
  }

  const normalized = SUBSCRIPTION_STATUS_MAP[status.toLowerCase()]
  if (normalized) {
    return normalized
  }

  // Treat unknown states as past_due so we surface them for manual review.
  return "past_due"
}

export async function ensureStripeEventRecord(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event
): Promise<StripeWebhookEventRow | null> {
  const { data: existing, error } = await supabase
    .from("stripe_webhook_events")
    .select("*")
    .eq("event_id", event.id)
    .maybeSingle()

  if (error) {
    console.error("Failed to load webhook event record", error)
    throw error
  }

  if (existing) {
    return existing
  }

  const insert: TablesInsert<'stripe_webhook_events'> = {
    event_id: event.id,
    event_type: event.type,
    status: "received",
    stripe_created_at: toIsoTimestamp(event.created ?? null),
    payload: event as unknown as TablesInsert<'stripe_webhook_events'>['payload'],
    processed_at: null,
    last_error: null,
    alert_count: 0,
    last_alert_at: null,
  }

  const { data: created, error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert(insert)
    .select()
    .single()

  if (insertError) {
    console.error("Failed to persist webhook event", insertError)
    throw insertError
  }

  return created
}

export async function updateStripeEventStatus(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
  status: StripeWebhookEventStatus,
  options?: {
    error?: string | null
    resetAlerts?: boolean
  }
) {
  const update: TablesUpdate<'stripe_webhook_events'> = {
    status,
    event_type: event.type,
    payload: event as unknown as TablesUpdate<'stripe_webhook_events'>['payload'],
  }

  if (status === "processed" || status === "failed") {
    update.processed_at = new Date().toISOString()
  } else if (status === "received") {
    update.processed_at = null
  }

  if (options?.error !== undefined) {
    update.last_error = options.error
  } else if (status !== "failed") {
    update.last_error = null
  }

  if (options?.resetAlerts) {
    update.alert_count = 0
    update.last_alert_at = null
  }

  const { error } = await supabase
    .from("stripe_webhook_events")
    .update(update)
    .eq("event_id", event.id)

  if (error) {
    console.error("Failed to update webhook event status", error)
    throw error
  }
}

export async function sendStripeWebhookFailureAlert(
  supabase: SupabaseClient<Database>,
  params: {
    event: Pick<StripeWebhookEventRow, "event_id" | "event_type" | "status" | "alert_count">
    message: string
  }
) {
  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["property_manager", "admin"])

  if (adminError) {
    console.error("Unable to load admin recipients for webhook alert", adminError)
    return
  }

  if (!admins || admins.length === 0) {
    console.warn("No admin recipients available for webhook failure alert")
    return
  }

  const nowIso = new Date().toISOString()
  const notificationRows = admins.map((admin) => ({
    user_id: admin.id,
    title: "Stripe webhook issue detected",
    message: params.message,
    type: "error" as const,
    action_url: "/payments",
    metadata: {
      eventId: params.event.event_id,
      eventType: params.event.event_type,
      status: params.event.status,
      source: "stripe-webhook-monitor",
    },
    read: false,
    created_at: nowIso,
  }))

  const { error: notifyError } = await supabase
    .from("notifications")
    .insert(notificationRows as TablesInsert<'notifications'>[])

  if (notifyError) {
    console.error("Failed to persist webhook failure notification", notifyError)
  }

  const { error: updateError } = await supabase
    .from("stripe_webhook_events")
    .update({
      alert_count: (params.event.alert_count ?? 0) + 1,
      last_alert_at: nowIso,
    })
    .eq("event_id", params.event.event_id)

  if (updateError) {
    console.error("Failed to update webhook alert metadata", updateError)
  }
}

interface ProcessStripeEventArgs {
  supabase: SupabaseClient<Database>
  stripe: Stripe
  event: Stripe.Event
}

export async function processStripeEvent({
  supabase,
  stripe,
  event,
}: ProcessStripeEventArgs): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        supabase,
        stripe,
        event.data.object as Stripe.Checkout.Session,
        event.id
      )
      break
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(
        supabase,
        stripe,
        event.data.object as Stripe.Invoice,
        event.id
      )
      break
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(
        supabase,
        stripe,
        event.data.object as Stripe.Invoice,
        event.id
      )
      break
    case "customer.subscription.created":
      await handleSubscriptionCreated(
        supabase,
        event.data.object as Stripe.Subscription,
        event.id
      )
      break
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        supabase,
        event.data.object as Stripe.Subscription,
        event.id
      )
      break
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        supabase,
        event.data.object as Stripe.Subscription,
        event.id
      )
      break
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(
        supabase,
        event.data.object as Stripe.PaymentIntent,
        event.id
      )
      break
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient<Database>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: [
      "line_items",
      "customer",
      "payment_intent",
      "payment_intent.latest_charge",
    ],
  })

  const lineItem = fullSession.line_items?.data?.[0]
  const tenantId = fullSession.metadata?.tenant_id ?? undefined
  const unitId = fullSession.metadata?.unit_id ?? undefined

  const paymentIntentId =
    typeof fullSession.payment_intent === "string"
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id

  const paymentIntent = paymentIntentId
    ? await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge", "payment_method"],
      })
    : null

  let paymentStatus = normalizeRentPaymentStatus(fullSession.payment_status)
  let chargeId: string | null = null
  let paymentMethodType: string | null = null
  let paymentMethod: string | null = null
  let receiptUrl: string | null = null

  if (paymentIntent) {
    paymentStatus = normalizeRentPaymentStatus(paymentIntent.status)
    paymentMethodType = paymentIntent.payment_method_types?.[0] ?? null
    if (typeof paymentIntent.payment_method === "string") {
      paymentMethod = paymentIntent.payment_method
    } else if (paymentIntent.payment_method) {
      paymentMethod = paymentIntent.payment_method.id
    }

    const latestCharge = paymentIntent.latest_charge
    if (typeof latestCharge === "string") {
      chargeId = latestCharge
    } else if (latestCharge && typeof latestCharge === "object") {
      const charge = latestCharge as Stripe.Charge
      chargeId = charge.id
      paymentStatus = normalizeRentPaymentStatus(charge.status)
      receiptUrl = charge.receipt_url ?? null
      if (charge.payment_method_details?.type) {
        paymentMethodType = charge.payment_method_details.type
      }
    }
  }

  const amountTotal = lineItem?.amount_total ?? fullSession.amount_total ?? 0
  const currency =
    lineItem?.currency?.toUpperCase() ?? fullSession.currency?.toUpperCase() ?? "USD"

  const rentPaymentData: TablesInsert<'rent_payments'> = {
    user_id:
      (tenantId as string | undefined) ||
      "00000000-0000-0000-0000-000000000000",
    stripe_payment_intent_id: paymentIntentId ?? session.id,
    stripe_charge_id: chargeId,
    stripe_customer_id:
      typeof fullSession.customer === "string"
        ? fullSession.customer
        : fullSession.customer?.id ?? null,
    amount: amountTotal / 100,
    currency,
    status: paymentStatus,
    payment_method: paymentMethod,
    payment_method_type: paymentMethodType,
    description:
      lineItem?.description ??
      `Payment for ${lineItem?.price?.nickname ?? "rent"}`,
    receipt_url: receiptUrl,
    metadata: buildMetadata(fullSession.metadata, {
      session_id: session.id,
      event_id: eventId,
      payment_status: fullSession.payment_status,
    }),
    tenant_id: tenantId,
    unit_id: unitId,
    processed_at: new Date().toISOString(),
  }

  const existingPayment = await findExistingRentPayment(
    supabase,
    paymentIntentId,
    session.id
  )

  if (existingPayment) {
    const update: TablesUpdate<'rent_payments'> = {
      stripe_charge_id: chargeId,
      stripe_customer_id: rentPaymentData.stripe_customer_id,
      amount: rentPaymentData.amount,
      currency: rentPaymentData.currency,
      status: rentPaymentData.status,
      payment_method: rentPaymentData.payment_method,
      payment_method_type: rentPaymentData.payment_method_type,
      description: rentPaymentData.description,
      receipt_url: rentPaymentData.receipt_url,
      metadata: buildMetadata(existingPayment.metadata as Record<string, unknown> | null, {
        session_id: session.id,
        event_id: eventId,
        payment_status: fullSession.payment_status,
      }),
      tenant_id: tenantId,
      unit_id: unitId,
      processed_at: rentPaymentData.processed_at,
    }

    await supabase
      .from("rent_payments")
      .update(update)
      .eq("id", existingPayment.id)
  } else {
    await supabase.from("rent_payments").insert(rentPaymentData)
  }

  if (tenantId) {
    await notifyTenantOfPaymentSuccess(
      supabase,
      tenantId,
      rentPaymentData.amount,
      rentPaymentData.description
    )
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient<Database>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventId: string
) {
  const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
    expand: ["subscription", "customer", "payment_intent"],
  })

  const subscription = fullInvoice.subscription as Stripe.Subscription | null
  const paymentIntentId =
    typeof fullInvoice.payment_intent === "string"
      ? fullInvoice.payment_intent
      : fullInvoice.payment_intent?.id

  const paymentIntent = paymentIntentId
    ? await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge", "payment_method"],
      })
    : null

  let paymentStatus = normalizeRentPaymentStatus(fullInvoice.status)
  let paymentMethodType: string | null = null
  let paymentMethod: string | null = null
  let chargeId: string | null = null
  let receiptUrl: string | null = null

  if (paymentIntent) {
    paymentStatus = normalizeRentPaymentStatus(paymentIntent.status)
    paymentMethodType = paymentIntent.payment_method_types?.[0] ?? null
    if (typeof paymentIntent.payment_method === "string") {
      paymentMethod = paymentIntent.payment_method
    } else if (paymentIntent.payment_method) {
      paymentMethod = paymentIntent.payment_method.id
    }

    const latestCharge = paymentIntent.latest_charge
    if (typeof latestCharge === "string") {
      chargeId = latestCharge
    } else if (latestCharge && typeof latestCharge === "object") {
      const charge = latestCharge as Stripe.Charge
      chargeId = charge.id
      receiptUrl = charge.receipt_url ?? null
      paymentStatus = normalizeRentPaymentStatus(charge.status)
      if (charge.payment_method_details?.type) {
        paymentMethodType = charge.payment_method_details.type
      }
    }
  }

  const tenantId = subscription?.metadata?.tenant_id
  const unitId = subscription?.metadata?.unit_id

  const amountPaid = (fullInvoice.amount_paid ?? 0) / 100
  const currency = fullInvoice.currency?.toUpperCase() ?? "USD"

  const rentPaymentData: TablesInsert<'rent_payments'> = {
    user_id:
      (tenantId as string | undefined) ||
      "00000000-0000-0000-0000-000000000000",
    stripe_payment_intent_id: paymentIntentId ?? invoice.id,
    stripe_charge_id: chargeId,
    stripe_customer_id:
      typeof fullInvoice.customer === "string"
        ? fullInvoice.customer
        : fullInvoice.customer?.id ?? null,
    stripe_subscription_id: subscription?.id ?? null,
    amount: amountPaid,
    currency,
    status: paymentStatus,
    payment_method: paymentMethod,
    payment_method_type: paymentMethodType,
    description: `Subscription payment - ${
      subscription?.metadata?.unit_label ?? "Rent"
    }`,
    receipt_url: receiptUrl ?? fullInvoice.hosted_invoice_url ?? null,
    metadata: buildMetadata(subscription?.metadata, {
      invoice_id: invoice.id,
      subscription_id: subscription?.id,
      billing_reason: fullInvoice.billing_reason,
      event_id: eventId,
    }),
    tenant_id: tenantId,
    unit_id: unitId,
    processed_at: new Date().toISOString(),
    billing_period_start: toIsoTimestamp(subscription?.current_period_start),
    billing_period_end: toIsoTimestamp(subscription?.current_period_end),
  }

  const existingPayment = await findExistingRentPayment(
    supabase,
    paymentIntentId,
    undefined,
    invoice.id
  )

  if (existingPayment) {
    const update: TablesUpdate<'rent_payments'> = {
      stripe_charge_id: chargeId,
      stripe_customer_id: rentPaymentData.stripe_customer_id,
      stripe_subscription_id: rentPaymentData.stripe_subscription_id,
      amount: rentPaymentData.amount,
      currency: rentPaymentData.currency,
      status: rentPaymentData.status,
      payment_method: rentPaymentData.payment_method,
      payment_method_type: rentPaymentData.payment_method_type,
      description: rentPaymentData.description,
      receipt_url: rentPaymentData.receipt_url,
      metadata: buildMetadata(existingPayment.metadata as Record<string, unknown> | null, {
        invoice_id: invoice.id,
        subscription_id: subscription?.id,
        billing_reason: fullInvoice.billing_reason,
        event_id: eventId,
      }),
      tenant_id: tenantId,
      unit_id: unitId,
      processed_at: rentPaymentData.processed_at,
      billing_period_start: rentPaymentData.billing_period_start,
      billing_period_end: rentPaymentData.billing_period_end,
    }

    await supabase
      .from("rent_payments")
      .update(update)
      .eq("id", existingPayment.id)
  } else {
    await supabase.from("rent_payments").insert(rentPaymentData)
  }

  if (subscription) {
    await upsertSubscriptionRecord(supabase, subscription, eventId)
  }

  if (tenantId) {
    await notifyTenantOfPaymentSuccess(
      supabase,
      tenantId,
      rentPaymentData.amount,
      rentPaymentData.description
    )
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient<Database>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventId: string
) {
  const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
    expand: ["subscription", "payment_intent"],
  })

  const subscription = fullInvoice.subscription as Stripe.Subscription | null
  const paymentIntentId =
    typeof fullInvoice.payment_intent === "string"
      ? fullInvoice.payment_intent
      : fullInvoice.payment_intent?.id

  const tenantId = subscription?.metadata?.tenant_id
  const unitId = subscription?.metadata?.unit_id

  const amountDue = (fullInvoice.amount_due ?? 0) / 100
  const currency = fullInvoice.currency?.toUpperCase() ?? "USD"

  const paymentStatus = "failed" satisfies RentPaymentStatus

  const existingPayment = await findExistingRentPayment(
    supabase,
    paymentIntentId,
    undefined,
    invoice.id
  )

  const metadataUpdates = {
    invoice_id: invoice.id,
    subscription_id: subscription?.id,
    billing_reason: fullInvoice.billing_reason,
    event_id: eventId,
  }

  if (existingPayment) {
    const update: TablesUpdate<'rent_payments'> = {
      status: paymentStatus,
      amount: amountDue,
      currency,
      tenant_id: tenantId,
      unit_id: unitId,
      metadata: buildMetadata(existingPayment.metadata as Record<string, unknown> | null, metadataUpdates),
      processed_at: new Date().toISOString(),
    }

    await supabase
      .from("rent_payments")
      .update(update)
      .eq("id", existingPayment.id)
  } else {
    const rentPaymentData: TablesInsert<'rent_payments'> = {
      user_id:
        (tenantId as string | undefined) ||
        "00000000-0000-0000-0000-000000000000",
      stripe_payment_intent_id: paymentIntentId ?? invoice.id,
      stripe_customer_id:
        typeof fullInvoice.customer === "string"
          ? fullInvoice.customer
          : fullInvoice.customer?.id ?? null,
      stripe_subscription_id: subscription?.id ?? null,
      amount: amountDue,
      currency,
      status: paymentStatus,
      description: `Subscription payment - ${
        subscription?.metadata?.unit_label ?? "Rent"
      }`,
      metadata: buildMetadata(subscription?.metadata, metadataUpdates),
      tenant_id: tenantId,
      unit_id: unitId,
      processed_at: new Date().toISOString(),
    }

    await supabase.from("rent_payments").insert(rentPaymentData)
  }

  if (subscription) {
    await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
  }
}

async function handleSubscriptionCreated(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  eventId: string
) {
  await upsertSubscriptionRecord(supabase, subscription, eventId)
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  eventId: string
) {
  await upsertSubscriptionRecord(supabase, subscription, eventId)
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  eventId: string
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
      metadata: buildMetadata(subscription.metadata as Record<string, unknown> | null, {
        event_id: eventId,
      }),
    })
    .eq("stripe_subscription_id", subscription.id)

  if (error) {
    console.error("Failed to mark subscription as canceled", error)
    throw error
  }
}

async function handlePaymentIntentFailed(
  supabase: SupabaseClient<Database>,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const paymentIntentId = paymentIntent.id
  const paymentStatus = normalizeRentPaymentStatus(paymentIntent.status)
  const tenantId = paymentIntent.metadata?.tenant_id
  const unitId = paymentIntent.metadata?.unit_id

  const existingPayment = await findExistingRentPayment(
    supabase,
    paymentIntentId,
    paymentIntent.metadata?.session_id ?? undefined
  )

  const metadataUpdates = buildMetadata(
    (existingPayment?.metadata as Record<string, unknown> | null) ??
      (paymentIntent.metadata as Record<string, unknown> | undefined),
    {
      event_id: eventId,
      payment_intent_status: paymentIntent.status,
    }
  )

  if (existingPayment) {
    const update: TablesUpdate<'rent_payments'> = {
      status: paymentStatus,
      tenant_id: tenantId,
      unit_id: unitId,
      metadata: metadataUpdates,
      processed_at: new Date().toISOString(),
    }

    await supabase
      .from("rent_payments")
      .update(update)
      .eq("id", existingPayment.id)
  } else {
    const rentPaymentData: TablesInsert<'rent_payments'> = {
      user_id:
        (tenantId as string | undefined) ||
        "00000000-0000-0000-0000-000000000000",
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: paymentIntent.customer
        ? typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer.id
        : null,
      amount: (paymentIntent.amount ?? 0) / 100,
      currency: paymentIntent.currency?.toUpperCase() ?? "USD",
      status: paymentStatus,
      payment_method: typeof paymentIntent.payment_method === "string"
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id ?? null,
      payment_method_type: paymentIntent.payment_method_types?.[0] ?? null,
      metadata: metadataUpdates,
      tenant_id: tenantId,
      unit_id: unitId,
      processed_at: new Date().toISOString(),
    }

    await supabase.from("rent_payments").insert(rentPaymentData)
  }
}

async function findExistingRentPayment(
  supabase: SupabaseClient<Database>,
  paymentIntentId?: string | null,
  sessionId?: string,
  invoiceId?: string
) {
  if (paymentIntentId) {
    const { data, error } = await supabase
      .from("rent_payments")
      .select("id, metadata")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle()

    if (error) {
      console.error("Failed to lookup rent payment by payment_intent", error)
    } else if (data) {
      return data
    }
  }

  if (invoiceId) {
    const { data, error } = await supabase
      .from("rent_payments")
      .select("id, metadata")
      .contains("metadata", { invoice_id: invoiceId })
      .maybeSingle()

    if (error) {
      console.error("Failed to lookup rent payment by invoice", error)
    } else if (data) {
      return data
    }
  }

  if (sessionId) {
    const { data, error } = await supabase
      .from("rent_payments")
      .select("id, metadata")
      .contains("metadata", { session_id: sessionId })
      .maybeSingle()

    if (error) {
      console.error("Failed to lookup rent payment by session", error)
    } else if (data) {
      return data
    }
  }

  return null
}

async function upsertSubscriptionRecord(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  eventId: string
) {
  const normalizedStatus = normalizeSubscriptionStatus(subscription.status)
  const price = subscription.items.data[0]?.price

  const subscriptionData: TablesInsert<'subscriptions'> = {
    user_id:
      (subscription.metadata?.tenant_id as string | undefined) ||
      "00000000-0000-0000-0000-000000000000",
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer
      ? typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id
      : null,
    status: normalizedStatus,
    current_period_start: toIsoTimestamp(subscription.current_period_start),
    current_period_end: toIsoTimestamp(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end ?? null,
    amount: (price?.unit_amount ?? 0) / 100,
    currency: price?.currency?.toUpperCase() ?? "USD",
    interval: price?.recurring?.interval === "year" ? "year" : "month",
    metadata: buildMetadata(subscription.metadata, {
      event_id: eventId,
      price_id: price?.id,
    }),
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "stripe_subscription_id" })

  if (error) {
    console.error("Failed to upsert subscription record", error)
    throw error
  }
}

async function notifyTenantOfPaymentSuccess(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  amount: number,
  description: string | null
) {
  const { data: tenantProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", tenantId)
    .maybeSingle()

  if (!tenantProfile?.email) {
    return
  }

  const amountDisplay = `$${amount.toFixed(2)}`

  try {
    await sendEmailNotification({
      to: tenantProfile.email,
      subject: `Payment Receipt - ${amountDisplay}`,
      template: "payment-receipt",
      data: {
        tenantName: tenantProfile.full_name || tenantProfile.email,
        amount: amountDisplay,
        description: description ?? "Rent payment",
        date: new Date().toLocaleDateString(),
      },
      userId: tenantId,
    })

    await sendInAppNotification({
      userId: tenantId,
      title: "Payment Successful",
      message: `Your payment of ${amountDisplay} has been processed successfully.`,
      type: "success",
      actionUrl: "/payments",
    })
  } catch (notificationError) {
    console.error("Failed to send tenant payment notification", notificationError)
  }
}
