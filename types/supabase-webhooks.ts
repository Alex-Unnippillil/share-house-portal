export interface SupabaseWebhookPayload {
  type: string
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

export function isSupabaseWebhookPayload(
  value: unknown
): value is SupabaseWebhookPayload {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<SupabaseWebhookPayload>

  return (
    typeof candidate.type === "string" &&
    typeof candidate.table === "string" &&
    typeof candidate.schema === "string" &&
    "record" in candidate &&
    "old_record" in candidate
  )
}
