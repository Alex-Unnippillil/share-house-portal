import 'server-only'

import type { Json } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/utils/supaone'

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
    const supabase = await createSupabaseServerClient()
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
