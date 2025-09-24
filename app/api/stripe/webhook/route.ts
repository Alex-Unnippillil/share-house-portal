import { headers } from "next/headers"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import {
  sendEmailNotification,
  sendInAppNotification,
  scheduleDunningCadence,
} from "@/lib/notifications"
import { getStripe } from "@/lib/stripe"
import type { Database, TablesInsert } from "@/lib/supabase"

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
  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response("Webhook not configured", { status: 500 })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return new Response("Supabase client not configured", { status: 500 })
  }

  const rawBody = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      webhookSecret
    )

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, event.data.object)
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event.data.object)
        break
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event.data.object)
        break
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(supabase, event.data.object)
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
        console.log(`Unhandled event type: ${event.type}`)
        break
    }

    return new Response("ok", { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload"
    console.error("Webhook error:", message)
    return new Response(`Webhook error: ${message}`, { status: 400 })
  }
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient<Database>,
  session: any
) {
  try {
    // Retrieve the full session with line items
    const stripe = getStripe()
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "customer"],
    })

    // For one-time payments, create a rent payment record
    if (fullSession.mode === "payment") {
      const lineItem = fullSession.line_items?.data[0]
      if (lineItem) {
        // Extract tenant and unit info from metadata if available
        const tenantId = fullSession.metadata?.tenant_id
        const unitId = fullSession.metadata?.unit_id

        const paymentData: TablesInsert<'rent_payments'> = {
          user_id: tenantId || "00000000-0000-0000-0000-000000000000", // Use tenant_id as user_id, or a default UUID
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_charge_id: session.payment_intent as string, // Will be updated when charge is available
          stripe_customer_id: session.customer as string,
          amount: lineItem.amount_total / 100, // Convert from cents
          currency: lineItem.currency.toUpperCase(),
          description:
            lineItem.description ||
            `Payment for ${lineItem.price?.nickname || "rent"}`,
          status: "completed",
          processed_at: new Date().toISOString(),
          receipt_url: session.receipt_url,
          tenant_id: tenantId,
          unit_id: unitId,
          payment_method_type: "card", // Default assumption
          metadata: {
            session_id: session.id,
            payment_status: session.payment_status,
            ...fullSession.metadata,
          },
        }

        await supabase.from("rent_payments").insert(paymentData)

        // Send payment receipt notification if we have tenant info
        if (tenantId) {
          try {
            // Get tenant profile
            const { data: tenantProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", tenantId)
              .single()

            if (tenantProfile?.email) {
              await sendEmailNotification({
                to: tenantProfile.email,
                subject: `Payment Receipt - $${paymentData.amount}`,
                template: "payment-receipt",
                data: {
                  tenantName: tenantProfile.full_name || tenantProfile.email,
                  amount: `$${paymentData.amount}`,
                  description: paymentData.description,
                  date: new Date(
                    paymentData.processed_at ?? new Date().toISOString()
                  ).toLocaleDateString(),
                },
                userId: tenantId,
              })

              // Also send in-app notification
              await sendInAppNotification({
                userId: tenantId,
                title: "Payment Successful",
                message: `Your payment of $${paymentData.amount} has been processed successfully.`,
                type: "success",
                actionUrl: "/payments",
              })
            }
          } catch (notificationError) {
            console.error(
              "Failed to send payment notification:",
              notificationError
            )
            // Don't fail the webhook for notification errors
          }
        }
      }
    }

    // For subscriptions, the subscription will be created separately
    // We might want to link the checkout session to the subscription here
  } catch (error) {
    console.error("Error handling checkout session completed:", error)
    throw error
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient<Database>,
  invoice: any
) {
  try {
    const stripe = getStripe()

    // Get the full invoice with subscription details
    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
      expand: ["subscription", "customer"],
    })

    const subscription = fullInvoice.subscription as any

    if (subscription) {
      // This is a subscription payment
      const amount = invoice.amount_paid / 100 // Convert from cents

      const subscriptionPayment: TablesInsert<'rent_payments'> = {
        user_id:
          subscription.metadata?.tenant_id ||
          "00000000-0000-0000-0000-000000000000", // Use tenant_id as user_id, or a default UUID
        stripe_customer_id: invoice.customer as string,
        stripe_subscription_id: subscription.id,
        amount,
        currency: invoice.currency.toUpperCase(),
        description: `Subscription payment - ${
          subscription.metadata?.unit_label || "Rent"
        }`,
        status: "completed",
        processed_at: new Date().toISOString(),
        receipt_url: invoice.hosted_invoice_url,
        tenant_id: subscription.metadata?.tenant_id,
        unit_id: subscription.metadata?.unit_id,
        payment_method_type: "card", // Default assumption
        billing_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
              .toISOString()
              .split("T")[0]
          : undefined,
        billing_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
              .toISOString()
              .split("T")[0]
          : undefined,
        metadata: {
          invoice_id: invoice.id,
          subscription_id: subscription.id,
          billing_reason: invoice.billing_reason,
        },
      }
      await supabase.from("rent_payments").insert(subscriptionPayment)

      // Update subscription status if needed
      await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id)
    }
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error)
    throw error
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient<Database>,
  invoice: any
) {
  try {
    const stripe = getStripe()
    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
      expand: ["subscription", "customer"],
    })

    const subscription = fullInvoice.subscription as any
    const tenantId =
      subscription?.metadata?.tenant_id || fullInvoice.metadata?.tenant_id || null
    const unitId =
      subscription?.metadata?.unit_id || fullInvoice.metadata?.unit_id || null
    const amountDue =
      (fullInvoice.amount_due ?? invoice.amount_due ?? 0) / 100
    const currency =
      (fullInvoice.currency ?? invoice.currency ?? "usd").toUpperCase()
    const nextAttemptIso = fullInvoice.next_payment_attempt
      ? new Date(fullInvoice.next_payment_attempt * 1000).toISOString()
      : undefined
    const failureMessage =
      fullInvoice.last_payment_error?.message ||
      invoice.last_payment_error?.message ||
      "The payment could not be completed"
    const failureCode =
      fullInvoice.last_payment_error?.code || invoice.last_payment_error?.code

    let tenantProfile: { full_name?: string | null; email?: string | null } | null =
      null
    if (tenantId) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", tenantId)
        .single()
      tenantProfile = data
    }

    const contactEmail =
      tenantProfile?.email ||
      (subscription?.metadata?.tenant_email as string | undefined) ||
      (fullInvoice.customer_email as string | undefined) ||
      null

    const amountFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    })
    const amountFormatted = amountFormatter.format(amountDue)
    const nextAttemptDisplay = nextAttemptIso
      ? new Date(nextAttemptIso).toLocaleString()
      : undefined

    const dunningPlan = contactEmail
      ? await scheduleDunningCadence({
          supabaseClient: supabase,
          userId: tenantId ?? undefined,
          email: contactEmail,
          tenantName:
            tenantProfile?.full_name ||
            (fullInvoice.customer_name as string | undefined) ||
            contactEmail,
          amount: amountDue,
          currency,
          paymentReference: fullInvoice.id,
          failedAt: new Date().toISOString(),
          nextPaymentAttempt: nextAttemptIso,
        })
      : { notifications: [], retrySchedule: [] }

    const paymentRecord: TablesInsert<'rent_payments'> = {
      user_id: tenantId || "00000000-0000-0000-0000-000000000000",
      stripe_payment_intent_id: (fullInvoice.payment_intent as string | null) ?? null,
      stripe_charge_id: (fullInvoice.charge as string | null) ?? null,
      stripe_customer_id: (fullInvoice.customer as string | null) ?? null,
      stripe_subscription_id: subscription?.id ?? null,
      amount: amountDue,
      currency,
      description: `Subscription payment - ${
        subscription?.metadata?.unit_label || "Rent"
      }`,
      status: "failed",
      processed_at: new Date().toISOString(),
      receipt_url: fullInvoice.hosted_invoice_url,
      tenant_id: tenantId,
      unit_id: unitId,
      payment_method_type:
        (fullInvoice.payment_settings?.payment_method_types?.[0] as string | undefined) ||
        null,
      metadata: {
        invoice_id: fullInvoice.id,
        subscription_id: subscription?.id,
        failure: {
          code: failureCode,
          message: failureMessage,
        },
        next_payment_attempt: nextAttemptIso ?? null,
        dunning_plan: dunningPlan,
      },
    }

    await supabase.from("rent_payments").insert(paymentRecord)

    if (subscription?.id) {
      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id)
    }

    if (contactEmail) {
      await sendEmailNotification({
        to: contactEmail,
        subject: `Rent payment failed - ${amountFormatted}`,
        template: "payment-failed",
        data: {
          tenantName:
            tenantProfile?.full_name ||
            (fullInvoice.customer_name as string | undefined) ||
            contactEmail,
          amount: amountFormatted,
          failureReason: failureMessage,
          nextAttempt: nextAttemptDisplay,
        },
        userId: tenantId ?? undefined,
      })
    }

    if (tenantId) {
      await sendInAppNotification({
        userId: tenantId,
        title: "Rent payment failed",
        message: `We couldn't process your rent payment of ${amountFormatted}. Please update your payment method to avoid late fees.`,
        type: "error",
        actionUrl: "/payments",
        metadata: {
          invoiceId: fullInvoice.id,
          subscriptionId: subscription?.id,
          failureCode,
        },
      })
    }
  } catch (error) {
    console.error("Error handling invoice payment failed:", error)
    throw error
  }
}

async function handlePaymentIntentFailed(
  supabase: SupabaseClient<Database>,
  paymentIntent: any
) {
  try {
    const tenantId = paymentIntent.metadata?.tenant_id || null
    const unitId = paymentIntent.metadata?.unit_id || null
    const amount = (paymentIntent.amount ?? 0) / 100
    const currency = (paymentIntent.currency ?? "usd").toUpperCase()
    const failureMessage =
      paymentIntent.last_payment_error?.message ||
      "The payment could not be completed"
    const failureCode = paymentIntent.last_payment_error?.code

    let tenantProfile: { full_name?: string | null; email?: string | null } | null =
      null
    if (tenantId) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", tenantId)
        .single()
      tenantProfile = data
    }

    const contactEmail =
      tenantProfile?.email ||
      paymentIntent.receipt_email ||
      paymentIntent.metadata?.tenant_email ||
      null

    const amountFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    })
    const amountFormatted = amountFormatter.format(amount)

    const tenantDisplayName = tenantProfile?.full_name || contactEmail || "Tenant"

    const dunningPlan = contactEmail
      ? await scheduleDunningCadence({
          supabaseClient: supabase,
          userId: tenantId ?? undefined,
          email: contactEmail,
          tenantName: tenantDisplayName,
          amount,
          currency,
          paymentReference: paymentIntent.id,
          failedAt: new Date().toISOString(),
        })
      : { notifications: [], retrySchedule: [] }

    await supabase.from("rent_payments").insert({
      user_id: tenantId || "00000000-0000-0000-0000-000000000000",
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: (paymentIntent.latest_charge as string | null) ?? null,
      stripe_customer_id: (paymentIntent.customer as string | null) ?? null,
      stripe_subscription_id: null,
      amount,
      currency,
      description:
        paymentIntent.metadata?.description ||
        paymentIntent.description ||
        "Rent payment",
      status: "failed",
      processed_at: new Date().toISOString(),
      receipt_url:
        paymentIntent.charges?.data?.[0]?.receipt_url ||
        paymentIntent.next_action?.receipt_url ||
        null,
      tenant_id: tenantId,
      unit_id: unitId,
      payment_method_type: paymentIntent.payment_method_types?.[0] || null,
      metadata: {
        payment_intent: paymentIntent.id,
        failure: {
          code: failureCode,
          message: failureMessage,
        },
        dunning_plan: dunningPlan,
      },
    })

    if (contactEmail) {
      await sendEmailNotification({
        to: contactEmail,
        subject: `Payment attempt failed - ${amountFormatted}`,
        template: "payment-failed",
        data: {
          tenantName: tenantDisplayName,
          amount: amountFormatted,
          failureReason: failureMessage,
        },
        userId: tenantId ?? undefined,
      })
    }

    if (tenantId) {
      await sendInAppNotification({
        userId: tenantId,
        title: "Payment attempt failed",
        message: `We couldn't process your payment of ${amountFormatted}. Please review your payment method before we retry.`,
        type: "error",
        actionUrl: "/payments",
        metadata: {
          paymentIntentId: paymentIntent.id,
          failureCode,
        },
      })
    }
  } catch (error) {
    console.error("Error handling payment intent failed:", error)
    throw error
  }
}

async function handleSubscriptionCreated(
  supabase: SupabaseClient<Database>,
  subscription: any
) {
  try {
    // This handles when a subscription is first created
    const price = subscription.items.data[0]?.price

    await supabase.from("subscriptions").insert({
      user_id:
        subscription.metadata?.tenant_id ||
        "00000000-0000-0000-0000-000000000000",
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      amount: price?.unit_amount || 0, // Convert from cents
      currency: price?.currency?.toUpperCase() || "USD",
      interval: "month", // Default, could be determined from price
      metadata: {
        ...subscription.metadata,
        price_id: price?.id,
      },
    })
  } catch (error) {
    console.error("Error handling subscription created:", error)
    throw error
  }
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient<Database>,
  subscription: any
) {
  try {
    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_start: new Date(
          subscription.current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
  } catch (error) {
    console.error("Error handling subscription updated:", error)
    throw error
  }
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient<Database>,
  subscription: any
) {
  try {
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        ended_at: new Date().toISOString(),
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
  } catch (error) {
    console.error("Error handling subscription deleted:", error)
    throw error
  }
}

// Export runtime config for edge runtime
export const runtime = "edge"
