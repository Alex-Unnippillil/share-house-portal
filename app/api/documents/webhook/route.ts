import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import type { Database, Json } from "@/lib/supabase"
import { markWebhookEventStatus, registerWebhookEvent } from "@/lib/webhook-events"

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function hasValidSignature(request: Request) {
  const secret = process.env.DOCUMENSO_WEBHOOK_SECRET
  if (!secret) {
    return true
  }

  const signature = request.headers.get("x-documenso-signature")
  return signature === secret
}

export async function POST(request: Request) {
  if (!hasValidSignature(request)) {
    return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 401 })
  }

  const rawBody = await request.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase admin client unavailable" },
      { status: 500 },
    )
  }

  const eventId = String(payload.eventId ?? payload.id ?? "unknown-event")
  const eventType = String(payload.event ?? payload.type ?? "unknown")

  const { isDuplicateProcessed } = await registerWebhookEvent(supabase, {
    provider: "documenso",
    eventId,
    eventType,
    payload: payload as Json,
    rawPayload: rawBody,
  })

  if (isDuplicateProcessed) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    await markWebhookEventStatus(supabase, {
      provider: "documenso",
      eventId,
      status: "processed",
      maxRetries: 3,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process document event"

    await markWebhookEventStatus(supabase, {
      provider: "documenso",
      eventId,
      status: "failed",
      errorMessage: message,
      maxRetries: 3,
      retriable: true,
    })

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

export const runtime = "nodejs"
