import { headers } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase"
import { notificationService } from "@/lib/notifications"

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response("Webhook not configured", { status: 500 })
  }

  const rawBody = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret)

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object)
        break
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object)
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

async function handleCheckoutSessionCompleted(session: any) {
  try {
    // Retrieve the full session with line items
    const stripe = getStripe()
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'customer']
    })

    // For one-time payments, create a rent payment record
    if (fullSession.mode === 'payment') {
      const lineItem = fullSession.line_items?.data[0]
      if (lineItem) {
        // Extract tenant and unit info from metadata if available
        const tenantId = fullSession.metadata?.tenant_id
        const unitId = fullSession.metadata?.unit_id

        const paymentData = {
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_charge_id: session.payment_intent as string, // Will be updated when charge is available
          stripe_customer_id: session.customer as string,
          amount: lineItem.amount_total / 100, // Convert from cents
          currency: lineItem.currency.toUpperCase(),
          description: lineItem.description || `Payment for ${lineItem.price?.nickname || 'rent'}`,
          status: 'completed',
          processed_at: new Date().toISOString(),
          receipt_url: session.receipt_url,
          tenant_id: tenantId,
          unit_id: unitId,
          payment_method_type: 'card', // Default assumption
          metadata: {
            session_id: session.id,
            payment_status: session.payment_status,
            ...fullSession.metadata
          }
        };

        await supabase.from('rent_payments').insert(paymentData);

        // Send payment receipt notification if we have tenant info
        if (tenantId) {
          try {
            // Get tenant profile
            const { data: tenantProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', tenantId)
              .single();

            if (tenantProfile?.email) {
              await notificationService.sendEmail({
                to: tenantProfile.email,
                subject: `Payment Receipt - $${paymentData.amount}`,
                template: 'payment-receipt',
                data: {
                  tenantName: tenantProfile.full_name || tenantProfile.email,
                  amount: `$${paymentData.amount}`,
                  description: paymentData.description,
                  date: new Date(paymentData.processed_at).toLocaleDateString(),
                },
                userId: tenantId,
              });

              // Also send in-app notification
              await notificationService.sendInAppNotification({
                userId: tenantId,
                title: "Payment Successful",
                message: `Your payment of $${paymentData.amount} has been processed successfully.`,
                type: 'success',
                actionUrl: '/payments',
              });
            }
          } catch (notificationError) {
            console.error('Failed to send payment notification:', notificationError);
            // Don't fail the webhook for notification errors
          }
        }
      }
    }

    // For subscriptions, the subscription will be created separately
    // We might want to link the checkout session to the subscription here

  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    const stripe = getStripe()

    // Get the full invoice with subscription details
    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
      expand: ['subscription', 'customer']
    })

    const subscription = fullInvoice.subscription as any

    if (subscription) {
      // This is a subscription payment
      const amount = invoice.amount_paid / 100 // Convert from cents

      await supabase.from('rent_payments').insert({
        stripe_customer_id: invoice.customer as string,
        stripe_subscription_id: subscription.id,
        amount: amount,
        currency: invoice.currency.toUpperCase(),
        description: `Subscription payment - ${subscription.metadata?.unit_label || 'Rent'}`,
        status: 'completed',
        processed_at: new Date().toISOString(),
        receipt_url: invoice.hosted_invoice_url,
        tenant_id: subscription.metadata?.tenant_id,
        unit_id: subscription.metadata?.unit_id,
        payment_method_type: 'card', // Default assumption
        billing_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString().split('T')[0] : undefined,
        billing_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString().split('T')[0] : undefined,
        metadata: {
          invoice_id: invoice.id,
          subscription_id: subscription.id,
          billing_reason: invoice.billing_reason
        }
      })

      // Update subscription status if needed
      await supabase.from('subscriptions').update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('stripe_subscription_id', subscription.id)
    }

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    // This handles when a subscription is first created
    const price = subscription.items.data[0]?.price

    await supabase.from('subscriptions').insert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      stripe_price_id: price?.id,
      amount: price?.unit_amount / 100, // Convert from cents
      currency: price?.currency.toUpperCase(),
      billing_cycle: 'monthly', // Default, could be determined from price
      status: subscription.status,
      started_at: new Date(subscription.created * 1000).toISOString(),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      tenant_id: subscription.metadata?.tenant_id,
      unit_id: subscription.metadata?.unit_id,
      metadata: {
        ...subscription.metadata
      }
    })

  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    await supabase.from('subscriptions').update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('stripe_subscription_id', subscription.id)

  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    await supabase.from('subscriptions').update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('stripe_subscription_id', subscription.id)

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

// Export runtime config for edge runtime
export const runtime = 'edge';


