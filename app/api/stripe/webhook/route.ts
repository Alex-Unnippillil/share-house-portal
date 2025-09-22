import { headers } from "next/headers"

import { processStripeEvent, ensureStripeEventRecord, updateStripeEventStatus, sendStripeWebhookFailureAlert } from "@/lib/payments/stripe-webhooks"
import { getStripe } from "@/lib/stripe"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response("Webhook not configured", { status: 500 })
  }

  let supabase

  try {
    supabase = createSupabaseAdminClient()
  } catch (error) {
    console.error("Unable to create Supabase admin client", error)
    return new Response("Supabase client not configured", { status: 500 })
  }

  const rawBody = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      webhookSecret
    )

    const eventRecord = await ensureStripeEventRecord(supabase, event)
    await updateStripeEventStatus(supabase, event, "received", {
      resetAlerts: true,
    })

    try {
      await processStripeEvent({
        supabase,
        stripe,
        event,
      })

      await updateStripeEventStatus(supabase, event, "processed")
      return new Response("ok", { status: 200 })
    } catch (processingError) {
      const message =
        processingError instanceof Error
          ? processingError.message
          : "Unknown processing error"

      console.error(
        `Stripe webhook event ${event.id} failed to process:`,
        processingError
      )

      await updateStripeEventStatus(supabase, event, "failed", {
        error: message,
      })

      try {
        await sendStripeWebhookFailureAlert(supabase, {
          event: {
            event_id: event.id,
            event_type: event.type,
            status: "failed",
            alert_count: eventRecord?.alert_count ?? 0,
          },
          message: `Stripe webhook event ${event.id} failed: ${message}`,
        })
      } catch (alertError) {
        console.error("Failed to dispatch webhook failure alert", alertError)
      }

      return new Response(`Webhook processing error: ${message}`, {
        status: 500,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload"
    console.error("Webhook error:", err)
    return new Response(`Webhook error: ${message}`, { status: 400 })
  }
}

export const runtime = "edge"
