import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getModerationRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

const PAGE_SIZE = 25

function buildPageHref(page: number) {
  return `/dashboard/operations/moderation?page=${page}`
}

export default async function ModerationOperationsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.moderation.view', actorId: user.id, actorRole: role, targetType: 'moderation' })

  const page = Number(searchParams?.page ?? '1')
  const result = await getModerationRows({ page: Number.isFinite(page) ? page : 1, pageSize: PAGE_SIZE })

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
        rows={result.rows.map((row) => [row.message_id, row.thread, row.author, row.flag_reason, row.status, new Date(row.created_at).toLocaleString()])}
        pagination={{
          page: result.page,
          totalPages: result.totalPages,
          totalRows: result.totalRows,
          prevHref: result.page > 1 ? buildPageHref(result.page - 1) : undefined,
          nextHref: result.page < result.totalPages ? buildPageHref(result.page + 1) : undefined,
        }}
      />
    </div>
  )
}
