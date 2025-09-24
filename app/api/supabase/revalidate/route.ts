import { NextRequest, NextResponse } from "next/server"

import {
  executeCacheRevalidators,
  type CacheRevalidationTarget,
} from "@/lib/cache/invalidation"
import { cacheRevalidationMonitor } from "@/lib/monitoring/cache-revalidation"
import {
  isSupabaseWebhookPayload,
  type SupabaseWebhookPayload,
} from "@/types/supabase-webhooks"

const TABLE_TARGET_MAP: Record<string, CacheRevalidationTarget[]> = {
  documents: ["documents"],
  document_signatures: ["documents"],
  document_access_logs: ["documents"],
  notifications: ["notifications"],
}

function resolveTargets(event: SupabaseWebhookPayload) {
  const normalizedTable = event.table.toLowerCase()
  return TABLE_TARGET_MAP[normalizedTable] ?? []
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Supabase webhook secret is not configured" },
      { status: 500 }
    )
  }

  const authorization = request.headers.get("authorization") ?? ""
  const expectedAuthorization = `Bearer ${secret}`
  if (authorization !== expectedAuthorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const events = Array.isArray(payload) ? payload : [payload]

  const results: Array<{
    target?: CacheRevalidationTarget
    table?: string
    type?: string
    status: "revalidated" | "skipped" | "failed"
    error?: string
  }> = []

  for (const candidate of events) {
    if (!isSupabaseWebhookPayload(candidate)) {
      cacheRevalidationMonitor.record({
        target: "supabase_webhook",
        status: "skipped",
        reason: "invalid_payload",
      })
      results.push({ status: "skipped" })
      continue
    }

    const event = candidate
    const targets = resolveTargets(event)

    if (targets.length === 0) {
      cacheRevalidationMonitor.record({
        target: event.table,
        status: "skipped",
        eventType: event.type,
        table: event.table,
        reason: "no_registered_targets",
      })
      results.push({
        table: event.table,
        type: event.type,
        status: "skipped",
      })
      continue
    }

    const executionResults = await executeCacheRevalidators(targets, {
      event,
    })

    for (const entry of executionResults) {
      results.push({
        target: entry.target,
        table: event.table,
        type: event.type,
        status: entry.status,
        error: entry.error,
      })
    }
  }

  const response = NextResponse.json({ results })
  response.headers.set("Cache-Control", "no-store")
  return response
}
