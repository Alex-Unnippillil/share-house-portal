import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getModerationRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

export default async function ModerationOperationsPage() {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.moderation.view', actorId: user.id, actorRole: role, targetType: 'moderation' })

  const rows = await getModerationRows()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moderation drill-down</h1>
        <p className="text-sm text-muted-foreground">Review unresolved threads and enforce community policies.</p>
      </div>
      <DomainTable
        title="Flagged message queue"
        description="Open flags require moderator resolution and follow-up."
        columns={['Message ID', 'Thread', 'Author', 'Reason', 'Status', 'Created at']}
        rows={rows.map((row) => [row.message_id, row.thread, row.author, row.flag_reason, row.status, new Date(row.created_at).toLocaleString()])}
      />
    </div>
  )
}
