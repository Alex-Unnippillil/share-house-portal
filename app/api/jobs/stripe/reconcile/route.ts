import { NextResponse } from "next/server"

import {
  ensureStripeEventRecord,
  processStripeEvent,
  sendStripeWebhookFailureAlert,
  updateStripeEventStatus,
} from "@/lib/payments/stripe-webhooks"
import { getStripe } from "@/lib/stripe"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

const DEFAULT_LOOKBACK_SECONDS = 60 * 60 * 24
const MAX_EVENTS = 500

export const runtime = "nodejs"

export async function POST(req: Request) {
  const stripe = getStripe()

  let supabase
  try {
    supabase = createSupabaseAdminClient()
  } catch (error) {
    console.error("Unable to create Supabase admin client", error)
    return NextResponse.json(
      { error: "Supabase client not configured" },
      { status: 500 }
    )
  }

  const url = new URL(req.url)
  const sinceParam = url.searchParams.get("since")
  const lookbackParam = url.searchParams.get("lookback")

  let lookbackSeconds = Number.parseInt(lookbackParam ?? "", 10)
  if (!Number.isFinite(lookbackSeconds) || lookbackSeconds <= 0) {
    lookbackSeconds = DEFAULT_LOOKBACK_SECONDS
  }

  let sinceEpoch = Number.parseInt(sinceParam ?? "", 10)
  if (!Number.isFinite(sinceEpoch) || sinceEpoch <= 0) {
    sinceEpoch = Math.floor(Date.now() / 1000) - lookbackSeconds
  }

  const results = {
    since: sinceEpoch,
    lookbackSeconds,
    totalConsidered: 0,
    processed: 0,
    retried: 0,
    skipped: 0,
    failures: [] as { eventId: string; message: string }[],
  }

  try {
    const events = stripe.events.list({
      limit: 100,
      created: { gte: sinceEpoch },
    })

    for await (const event of events) {
      results.totalConsidered += 1
      if (results.totalConsidered > MAX_EVENTS) {
        break
      }

      const existingRecord = await ensureStripeEventRecord(supabase, event)

      if (existingRecord?.status === "processed") {
        results.skipped += 1
        continue
      }

      await updateStripeEventStatus(supabase, event, "received", {
        resetAlerts: true,
      })

      try {
        await processStripeEvent({ supabase, stripe, event })
        await updateStripeEventStatus(supabase, event, "processed")
        results.processed += 1

        if (existingRecord && existingRecord.status && existingRecord.status !== "received") {
          results.retried += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown processing error"
        console.error(`Failed to reconcile Stripe event ${event.id}:`, error)

        results.failures.push({ eventId: event.id, message })

        await updateStripeEventStatus(supabase, event, "failed", {
          error: message,
        })

        try {
          await sendStripeWebhookFailureAlert(supabase, {
            event: {
              event_id: event.id,
              event_type: event.type,
              status: "failed",
              alert_count: existingRecord?.alert_count ?? 0,
            },
            message: `Reconciliation failed for event ${event.id}: ${message}`,
          })
        } catch (alertError) {
          console.error("Failed to send reconciliation alert", alertError)
        }
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Stripe reconciliation job failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
