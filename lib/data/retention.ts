import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

const REDACTED_VISITOR_NAME = "[redacted]"
const REDACTED_VISITOR_EMAIL = "redacted@example.invalid"
const REDACTED_DOCUMENT_TITLE = "Signed document (redacted)"

export interface RetentionPlan {
  visitorAnonymizeBefore: string
  visitorPurgeBefore: string
  signedDocumentRedactBefore: string
  notificationPurgeBefore: string
}

export interface RetentionExecutionOptions {
  dryRun: boolean
}

export interface RetentionEntityResult {
  entity: "visitor_logs.anonymize" | "visitor_logs.purge" | "documents.signed_metadata_minimize" | "notifications.purge"
  candidates: number
  affected: number
  dryRun: boolean
  error: string | null
}

function listIds(rows: Array<{ id: string }> | null | undefined) {
  return (rows ?? []).map((row) => row.id)
}

export async function applyVisitorLogAnonymization(
  client: SupabaseClient<Database>,
  plan: RetentionPlan,
  options: RetentionExecutionOptions
): Promise<RetentionEntityResult> {
  const entity: RetentionEntityResult["entity"] = "visitor_logs.anonymize"

  const { data, error } = await (client as any)
    .from("visitor_logs")
    .select("id")
    .lt("check_out_date", plan.visitorAnonymizeBefore)
    .neq("guest_name", REDACTED_VISITOR_NAME)

  if (error) {
    return { entity, candidates: 0, affected: 0, dryRun: options.dryRun, error: error.message }
  }

  const ids = listIds(data)
  if (options.dryRun || ids.length === 0) {
    return { entity, candidates: ids.length, affected: 0, dryRun: options.dryRun, error: null }
  }

  const { error: updateError } = await (client as any)
    .from("visitor_logs")
    .update({
      guest_name: REDACTED_VISITOR_NAME,
      guest_email: REDACTED_VISITOR_EMAIL,
      guest_phone: null,
      emergency_contact: null,
      special_notes: null,
      reason: "[redacted by retention policy]",
      purpose: "[redacted by retention policy]",
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)

  return {
    entity,
    candidates: ids.length,
    affected: updateError ? 0 : ids.length,
    dryRun: options.dryRun,
    error: updateError?.message ?? null,
  }
}

export async function applyVisitorLogPurge(
  client: SupabaseClient<Database>,
  plan: RetentionPlan,
  options: RetentionExecutionOptions
): Promise<RetentionEntityResult> {
  const entity: RetentionEntityResult["entity"] = "visitor_logs.purge"

  const { data, error } = await (client as any)
    .from("visitor_logs")
    .select("id")
    .lt("check_out_date", plan.visitorPurgeBefore)

  if (error) {
    return { entity, candidates: 0, affected: 0, dryRun: options.dryRun, error: error.message }
  }

  const ids = listIds(data)
  if (options.dryRun || ids.length === 0) {
    return { entity, candidates: ids.length, affected: 0, dryRun: options.dryRun, error: null }
  }

  const { error: deleteError } = await (client as any).from("visitor_logs").delete().in("id", ids)

  return {
    entity,
    candidates: ids.length,
    affected: deleteError ? 0 : ids.length,
    dryRun: options.dryRun,
    error: deleteError?.message ?? null,
  }
}

export async function applySignedDocumentMetadataMinimization(
  client: SupabaseClient<Database>,
  plan: RetentionPlan,
  options: RetentionExecutionOptions
): Promise<RetentionEntityResult> {
  const entity: RetentionEntityResult["entity"] = "documents.signed_metadata_minimize"

  const { data, error } = await (client as any)
    .from("documents")
    .select("id,title,description")
    .eq("status", "signed")
    .lt("signed_at", plan.signedDocumentRedactBefore)

  if (error) {
    return { entity, candidates: 0, affected: 0, dryRun: options.dryRun, error: error.message }
  }

  const candidates = (data ?? []).filter(
    (row: { title: string | null; description: string | null }) =>
      row.title !== REDACTED_DOCUMENT_TITLE || row.description !== null
  ) as Array<{ id: string }>

  const ids = listIds(candidates)

  if (options.dryRun || ids.length === 0) {
    return { entity, candidates: ids.length, affected: 0, dryRun: options.dryRun, error: null }
  }

  const { error: updateError } = await (client as any)
    .from("documents")
    .update({
      title: REDACTED_DOCUMENT_TITLE,
      description: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)

  return {
    entity,
    candidates: ids.length,
    affected: updateError ? 0 : ids.length,
    dryRun: options.dryRun,
    error: updateError?.message ?? null,
  }
}

export async function applyNotificationPurge(
  client: SupabaseClient<Database>,
  plan: RetentionPlan,
  options: RetentionExecutionOptions
): Promise<RetentionEntityResult> {
  const entity: RetentionEntityResult["entity"] = "notifications.purge"

  const { data, error } = await (client as any)
    .from("notifications")
    .select("id")
    .lt("created_at", plan.notificationPurgeBefore)

  if (error) {
    return { entity, candidates: 0, affected: 0, dryRun: options.dryRun, error: error.message }
  }

  const ids = listIds(data)
  if (options.dryRun || ids.length === 0) {
    return { entity, candidates: ids.length, affected: 0, dryRun: options.dryRun, error: null }
  }

  const { error: deleteError } = await (client as any).from("notifications").delete().in("id", ids)

  return {
    entity,
    candidates: ids.length,
    affected: deleteError ? 0 : ids.length,
    dryRun: options.dryRun,
    error: deleteError?.message ?? null,
  }
}

export function buildRetentionPlan(now = new Date()): RetentionPlan {
  const msPerDay = 24 * 60 * 60 * 1000
  const isoDaysAgo = (days: number) => new Date(now.getTime() - days * msPerDay).toISOString()

  return {
    visitorAnonymizeBefore: isoDaysAgo(180),
    visitorPurgeBefore: isoDaysAgo(365),
    signedDocumentRedactBefore: isoDaysAgo(365),
    notificationPurgeBefore: isoDaysAgo(90),
  }
}
