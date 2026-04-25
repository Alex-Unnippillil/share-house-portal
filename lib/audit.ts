import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/supabase'
import { createSupbaseServerClient } from '@/utils/supaone'

export type AuditAction =
  | 'operations.dashboard.view'
  | 'operations.finance.view'
  | 'operations.maintenance.view'
  | 'operations.bookings.view'
  | 'operations.moderation.view'
  | 'operations.search.query'
  | 'operations.export.finance'
  | 'operations.export.maintenance'
  | 'operations.export.bookings'
  | 'operations.export.visitors'

export async function writeAuditRecord(input: {
  action: AuditAction
  actorId: string
  actorRole: string | null
  targetType: string
  targetId?: string | null
  metadata?: Json
}) {
  try {
    const supabase = await createSupbaseServerClient()
    await supabase.from('audit_logs').insert({
      action: input.action,
      actor_id: input.actorId,
      actor_role: input.actorRole,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? null,
      occurred_at: new Date().toISOString(),
    } as any)
  } catch (error) {
    console.error('Unable to persist audit record', {
      action: input.action,
      actorId: input.actorId,
      error,
    })
  }
}

export async function writeRetentionExecutionAuditLog(
  client: SupabaseClient<Database>,
  input: {
    actorId: string
    jobId: string
    entity: string
    mode: 'execute' | 'dry-run'
    candidates: number
    affected: number
    metadata?: Json
    error?: string | null
  }
) {
  const payload = {
    actor_id: input.actorId,
    job_id: input.jobId,
    entity: input.entity,
    mode: input.mode,
    candidates: input.candidates,
    affected: input.affected,
    metadata: input.metadata ?? null,
    error: input.error ?? null,
    created_at: new Date().toISOString(),
  }

  const { error } = await (client as any).from('retention_execution_audit_logs').insert(payload)

  if (error) {
    console.error('Unable to persist retention execution audit log', {
      ...payload,
      error,
    })
  }
}
