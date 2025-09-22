import { NextResponse } from "next/server"

import { sendStripeWebhookFailureAlert } from "@/lib/payments/stripe-webhooks"
import type { Tables } from "@/lib/supabase"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

const DEFAULT_STALE_MINUTES = 10
const DEFAULT_COOLDOWN_MINUTES = 30

export const runtime = "nodejs"

export async function POST(req: Request) {
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
  const staleParam = url.searchParams.get("staleMinutes")
  const cooldownParam = url.searchParams.get("cooldownMinutes")

  let staleMinutes = Number.parseInt(staleParam ?? "", 10)
  if (!Number.isFinite(staleMinutes) || staleMinutes <= 0) {
    staleMinutes = DEFAULT_STALE_MINUTES
  }

  let cooldownMinutes = Number.parseInt(cooldownParam ?? "", 10)
  if (!Number.isFinite(cooldownMinutes) || cooldownMinutes <= 0) {
    cooldownMinutes = DEFAULT_COOLDOWN_MINUTES
  }

  const now = Date.now()
  const staleCutoffIso = new Date(now - staleMinutes * 60 * 1000).toISOString()
  const cooldownCutoffIso = new Date(now - cooldownMinutes * 60 * 1000).toISOString()

  const results = {
    flagged: 0,
    alertsSent: 0,
    alertedEventIds: [] as string[],
  }

  try {
    const { data: failedEvents, error: failedError } = await supabase
      .from("stripe_webhook_events")
      .select("*")
      .eq("status", "failed")
      .or(`last_alert_at.is.null,last_alert_at.lte.${cooldownCutoffIso}`)

    if (failedError) {
      throw failedError
    }

    const { data: staleEvents, error: staleError } = await supabase
      .from("stripe_webhook_events")
      .select("*")
      .eq("status", "received")
      .lte("created_at", staleCutoffIso)
      .or(`last_alert_at.is.null,last_alert_at.lte.${cooldownCutoffIso}`)

    if (staleError) {
      throw staleError
    }

    const eventsById = new Map<string, Tables<'stripe_webhook_events'>>()

    for (const event of failedEvents ?? []) {
      eventsById.set(event.event_id, event as Tables<'stripe_webhook_events'>)
    }

    for (const event of staleEvents ?? []) {
      if (!eventsById.has(event.event_id)) {
        eventsById.set(event.event_id, event as Tables<'stripe_webhook_events'>)
      }
    }

    results.flagged = eventsById.size

    for (const event of eventsById.values()) {
      const createdAt = event.created_at ? Date.parse(event.created_at) : now
      const minutesOpen = Math.max(0, Math.round((now - createdAt) / 60000))
      const message =
        event.status === "failed"
          ? `Stripe webhook event ${event.event_id} failed: ${event.last_error ?? "unknown error"}.`
          : `Stripe webhook event ${event.event_id} has been pending for ${minutesOpen} minutes without processing.`

      try {
        await sendStripeWebhookFailureAlert(supabase, {
          event: {
            event_id: event.event_id,
            event_type: event.event_type,
            status: event.status,
            alert_count: event.alert_count ?? 0,
          },
          message,
        })
        results.alertsSent += 1
        results.alertedEventIds.push(event.event_id)
      } catch (alertError) {
        console.error("Failed to send webhook monitor alert", alertError)
      }
    }

    return NextResponse.json({
      ...results,
      staleMinutes,
      cooldownMinutes,
    })
  } catch (error) {
    console.error("Stripe webhook monitor job failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
