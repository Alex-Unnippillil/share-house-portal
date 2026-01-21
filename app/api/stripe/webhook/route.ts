import { headers } from "next/headers"
import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js"

import {
  sendEmailNotification,
  sendInAppNotification,
} from "@/lib/notifications"
import { jsonError } from "@/lib/errors"
import { getStripe } from "@/lib/stripe"
import type { Database, TablesInsert } from "@/lib/supabase"

type StripeEvent = {
  id: string
  type: string
  data: { object: unknown }
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

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return jsonError("CONFIGURATION_ERROR", {
      message: "Stripe webhook secret is not configured",
    })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return jsonError("CONFIGURATION_ERROR", {
      message: "Supabase client not configured",
    })
  }

  const rawBody = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      webhookSecret
    )

    await processStripeEvent(supabase, event)

    return new Response("ok", { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload"
    console.error("Webhook error:", message)
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes("signature")) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message,
        details: { reason: "stripe_signature_verification_failed" },
      })
    }

    return jsonError("INTERNAL_SERVER_ERROR", {
      message,
    })
  }
}

async function markStripeEventHandled(
  supabase: SupabaseClient<Database>,
  eventId: string,
  eventType: string
): Promise<boolean> {
  const { error } = await supabase.from("stripe_processed_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  })

  if (!error) {
    return true
  }

  if ((error as PostgrestError | null)?.code === "23505") {
    // Event has already been processed
    return false
  }

  throw new Error(
    `Failed to record processed Stripe event ${eventId}: ${error?.message ?? "unknown error"}`
  )
}

const EVENT_HANDLERS: Record<
  StripeEvent["type"],
  (supabase: SupabaseClient<Database>, payload: any) => Promise<void>
> = {
  "checkout.session.completed": handleCheckoutSessionCompleted,
  "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
  "customer.subscription.created": handleSubscriptionCreated,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
}

export async function processStripeEvent(
  supabase: SupabaseClient<Database>,
  event: StripeEvent
): Promise<boolean> {
  const handler = EVENT_HANDLERS[event.type]

  if (!handler) {
    console.log(`Unhandled event type: ${event.type}`)
    return false
  }

  const shouldProcess = await markStripeEventHandled(
    supabase,
    event.id,
    event.type
  )

  if (!shouldProcess) {
    return false
  }

  await handler(supabase, event.data.object)
  return true
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

        await supabase
          .from("rent_payments")
          .upsert(paymentData, {
            onConflict: "stripe_payment_intent_id",
          })

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
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent,
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
      await supabase
        .from("rent_payments")
        .upsert(subscriptionPayment, {
          onConflict: "stripe_invoice_id",
        })

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
