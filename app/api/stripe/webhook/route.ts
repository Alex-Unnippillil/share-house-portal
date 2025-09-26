import * as Sentry from "@sentry/nextjs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import {
  sendEmailNotification,
  sendInAppNotification,
} from "@/lib/notifications"
import { jsonError } from "@/lib/errors"
import { getStripe } from "@/lib/stripe"
import type { Database, TablesInsert } from "@/lib/supabase"
import { getRequestLogger, type StructuredLogger } from "@/lib/logger"

type SupabaseMutationAction = "insert" | "update"

function createSupabaseAdminClient(
  logger: StructuredLogger
): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error(
      {
        event: "supabase.configuration_missing",
      },
      "Supabase admin credentials are not configured"
    )
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
  const requestId =
    req.headers.get("x-request-id") ?? req.headers.get("x-vercel-id")
  const logger = getRequestLogger({ requestId })
  const stripe = getStripe()
  const signature = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error(
      {
        event: "stripe.configuration_missing",
      },
      "Stripe webhook secret is not configured"
    )
    return jsonError("CONFIGURATION_ERROR", {
      message: "Stripe webhook secret is not configured",
    })
  }

  const supabase = createSupabaseAdminClient(logger)
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

    const customerId = extractCustomerId(event)
    const tenantId = extractTenantId(event)

    const eventLogger = logger.child({
      ...(tenantId ? { userId: tenantId } : {}),
      stripeCustomerId: customerId ?? "unknown",
      stripeEventId: event.id,
      stripeEventType: event.type,
    })

    Sentry.addBreadcrumb({
      category: "stripe.webhook",
      type: "info",
      data: {
        eventId: event.id,
        type: event.type,
        customer: customerId,
      },
    })

    return await Sentry.startSpan(
      {
        name: "stripe.webhook",
        attributes: {
          "stripe.event_id": event.id,
          "stripe.event_type": event.type,
          "stripe.customer_id": customerId ?? "unknown",
        },
      },
      async (span) => {
        try {
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutSessionCompleted(
                supabase,
                event.data.object,
                eventLogger
              )
              break
            case "invoice.payment_succeeded":
              await handleInvoicePaymentSucceeded(
                supabase,
                event.data.object,
                eventLogger
              )
              break
            case "customer.subscription.created":
              await handleSubscriptionCreated(
                supabase,
                event.data.object,
                eventLogger
              )
              break
            case "customer.subscription.updated":
              await handleSubscriptionUpdated(
                supabase,
                event.data.object,
                eventLogger
              )
              break
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(
                supabase,
                event.data.object,
                eventLogger
              )
              break
            default:
              eventLogger.info(
                {
                  event: "stripe.webhook.unhandled",
                },
                `Unhandled event type: ${event.type}`
              )
              break
          }

          span?.setStatus("ok")
          return new Response("ok", { status: 200 })
        } catch (error) {
          span?.setStatus("internal_error")
          throw error
        }
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload"
    logger.error(
      {
        err,
        event: "stripe.webhook.failure",
      },
      "Webhook processing failed"
    )
    Sentry.captureException(err)
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

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient<Database>,
  session: Stripe.Checkout.Session,
  logger: StructuredLogger
) {
  const handlerLogger = logger.child({ handler: "checkout.session.completed" })
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

        await traceSupabaseMutation(
          "rent_payments",
          "insert",
          () => supabase.from("rent_payments").insert(paymentData),
          {
            tenantId,
            unitId,
          }
        )

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
            handlerLogger.warn(
              {
                err: notificationError,
                event: "stripe.webhook.notification_failure",
              },
              "Failed to send payment notification"
            )
            // Don't fail the webhook for notification errors
          }
        }
      }
    }

    // For subscriptions, the subscription will be created separately
    // We might want to link the checkout session to the subscription here
  } catch (error) {
    handlerLogger.error(
      {
        err: error,
        event: "stripe.webhook.checkout_session_error",
      },
      "Error handling checkout session completed"
    )
    throw error
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
  logger: StructuredLogger
) {
  const handlerLogger = logger.child({ handler: "invoice.payment_succeeded" })
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
      await traceSupabaseMutation(
        "rent_payments",
        "insert",
        () => supabase.from("rent_payments").insert(subscriptionPayment),
        {
          tenantId: subscription.metadata?.tenant_id,
          unitId: subscription.metadata?.unit_id,
        }
      )

      // Update subscription status if needed
      await traceSupabaseMutation(
        "subscriptions",
        "update",
        () =>
          supabase
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
            .eq("stripe_subscription_id", subscription.id),
        {
          subscriptionId: subscription.id,
        }
      )
    }
  } catch (error) {
    handlerLogger.error(
      {
        err: error,
        event: "stripe.webhook.invoice_payment_error",
      },
      "Error handling invoice payment succeeded"
    )
    throw error
  }
}

async function handleSubscriptionCreated(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  logger: StructuredLogger
) {
  const handlerLogger = logger.child({ handler: "customer.subscription.created" })
  try {
    // This handles when a subscription is first created
    const price = subscription.items.data[0]?.price

    await traceSupabaseMutation(
      "subscriptions",
      "insert",
      () =>
        supabase.from("subscriptions").insert({
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
        }),
      {
        subscriptionId: subscription.id,
        tenantId: subscription.metadata?.tenant_id,
      }
    )
  } catch (error) {
    handlerLogger.error(
      {
        err: error,
        event: "stripe.webhook.subscription_created_error",
      },
      "Error handling subscription created"
    )
    throw error
  }
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  logger: StructuredLogger
) {
  const handlerLogger = logger.child({ handler: "customer.subscription.updated" })
  try {
    await traceSupabaseMutation(
      "subscriptions",
      "update",
      () =>
        supabase
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
          .eq("stripe_subscription_id", subscription.id),
      {
        subscriptionId: subscription.id,
      }
    )
  } catch (error) {
    handlerLogger.error(
      {
        err: error,
        event: "stripe.webhook.subscription_updated_error",
      },
      "Error handling subscription updated"
    )
    throw error
  }
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
  logger: StructuredLogger
) {
  const handlerLogger = logger.child({ handler: "customer.subscription.deleted" })
  try {
    await traceSupabaseMutation(
      "subscriptions",
      "update",
      () =>
        supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            ended_at: new Date().toISOString(),
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id),
      {
        subscriptionId: subscription.id,
      }
    )
  } catch (error) {
    handlerLogger.error(
      {
        err: error,
        event: "stripe.webhook.subscription_deleted_error",
      },
      "Error handling subscription deleted"
    )
    throw error
  }
}

// Export runtime config for edge runtime
export const runtime = "nodejs"

function extractCustomerId(event: Stripe.Event) {
  const stripeObject = event.data?.object as
    | Stripe.Checkout.Session
    | Stripe.Invoice
    | Stripe.Subscription
    | undefined

  if (!stripeObject) {
    return undefined
  }

  if ("customer" in stripeObject) {
    const value = stripeObject.customer
    if (typeof value === "string") {
      return value
    }
  }

  if ("customer_details" in stripeObject) {
    const details = stripeObject.customer_details
    if (details && "id" in details && typeof details.id === "string") {
      return details.id
    }
  }

  return undefined
}

function extractTenantId(event: Stripe.Event) {
  const stripeObject = event.data?.object as
    | { metadata?: Record<string, string | null | undefined> }
    | undefined

  return stripeObject?.metadata?.tenant_id ?? undefined
}

async function traceSupabaseMutation<T>(
  table: string,
  action: SupabaseMutationAction,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: "supabase.mutation",
    type: "info",
    data: {
      table,
      action,
      ...metadata,
    },
  })

  return Sentry.startSpan(
    {
      name: `supabase.${action}`,
      attributes: {
        "supabase.table": table,
        "supabase.action": action,
      },
    },
    async () => operation()
  )
}
