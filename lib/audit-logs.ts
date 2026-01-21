import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import type { Database } from "@/lib/supabase"

export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"]

export interface AuditLogEntryInput {
  action: string
  actorUserId: string
  actorRole: Database["public"]["Tables"]["profiles"]["Row"]["role"]
  targetUserId?: string | null
  performedUnderImpersonation?: boolean
  metadata?: AuditLogRow["metadata"]
}

export async function recordAuditLog(
  client: TypedSupabaseClient,
  entry: AuditLogEntryInput
) {
  const { error } = await client.from("audit_logs").insert({
    action: entry.action,
    actor_user_id: entry.actorUserId,
    actor_role: entry.actorRole ?? null,
    target_user_id: entry.targetUserId ?? null,
    performed_under_impersonation: entry.performedUnderImpersonation ?? false,
    metadata: entry.metadata ?? null,
  })

  if (error) {
    throw new Error(`Failed to record audit log entry: ${error.message}`)
  }
}
