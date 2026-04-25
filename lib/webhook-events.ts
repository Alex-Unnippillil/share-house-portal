import crypto from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json, TablesUpdate } from "@/lib/supabase"

export type WebhookProvider = "stripe" | "calcom" | "documenso"

type WebhookStatus = Database["public"]["Tables"]["webhook_events"]["Row"]["status"]

type RegisterWebhookEventParams = {
  provider: WebhookProvider
  eventId: string
  eventType: string
  payload: Json
  rawPayload: string
}

type RegisterWebhookEventResult = {
  isDuplicateProcessed: boolean
  payloadHash: string
}

type MarkWebhookEventStatusParams = {
  provider: WebhookProvider
  eventId: string
  status: WebhookStatus
  errorMessage?: string | null
  retryCount?: number
  maxRetries?: number
  retriable?: boolean
}

function buildPayloadHash(rawPayload: string) {
  return crypto.createHash("sha256").update(rawPayload).digest("hex")
}

export async function registerWebhookEvent(
  supabase: SupabaseClient<Database>,
  params: RegisterWebhookEventParams,
): Promise<RegisterWebhookEventResult> {
  const payloadHash = buildPayloadHash(params.rawPayload)
  const now = new Date().toISOString()

  const { error } = await supabase.from("webhook_events").insert({
    provider: params.provider,
    event_id: params.eventId,
    event_type: params.eventType,
    status: "processing",
    payload: params.payload,
    payload_hash: payloadHash,
    processed_at: now,
    last_attempt_at: now,
  })

  if (!error) {
    return { isDuplicateProcessed: false, payloadHash }
  }

  if (error.code !== "23505") {
    throw error
  }

  const { data: existing, error: selectError } = await supabase
    .from("webhook_events")
    .select("status")
    .eq("provider", params.provider)
    .eq("event_id", params.eventId)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existing?.status === "processed") {
    return { isDuplicateProcessed: true, payloadHash }
  }

  await supabase
    .from("webhook_events")
    .update({
      status: "processing",
      payload: params.payload,
      payload_hash: payloadHash,
      error_message: null,
      last_attempt_at: now,
      next_retry_at: null,
      dead_lettered_at: null,
    })
    .eq("provider", params.provider)
    .eq("event_id", params.eventId)

  return { isDuplicateProcessed: false, payloadHash }
}

export async function markWebhookEventStatus(
  supabase: SupabaseClient<Database>,
  params: MarkWebhookEventStatusParams,
) {
  const now = new Date().toISOString()
  const update: TablesUpdate<"webhook_events"> = {
    status: params.status,
    error_message: params.errorMessage ?? null,
    processed_at: now,
    retry_count: params.retryCount ?? 0,
    max_retries: params.maxRetries ?? 0,
    dead_lettered_at: params.status === "dead_lettered" ? now : null,
    last_attempt_at: now,
    next_retry_at: params.retriable ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
  }

  await supabase
    .from("webhook_events")
    .update(update)
    .eq("provider", params.provider)
    .eq("event_id", params.eventId)
}

export async function appendWebhookPayloadMetadata(
  supabase: SupabaseClient<Database>,
  params: {
    provider: WebhookProvider
    eventId: string
    metadata: Record<string, string | null>
  },
) {
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("payload")
    .eq("provider", params.provider)
    .eq("event_id", params.eventId)
    .maybeSingle()

  const payloadObject =
    existing?.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload)
      ? (existing.payload as Record<string, unknown>)
      : {}

  await supabase
    .from("webhook_events")
    .update({
      payload: {
        ...payloadObject,
        reconciliation: {
          ...(payloadObject.reconciliation as Record<string, unknown> | undefined),
          ...params.metadata,
        },
      } as Json,
    })
    .eq("provider", params.provider)
    .eq("event_id", params.eventId)
}
