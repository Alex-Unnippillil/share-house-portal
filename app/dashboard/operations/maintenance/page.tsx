import Link from 'next/link'

import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getMaintenanceRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

const PAGE_SIZE = 25

function buildPageHref(page: number) {
  return `/dashboard/operations/maintenance?page=${page}`
}

export default async function MaintenanceOperationsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.maintenance.view', actorId: user.id, actorRole: role, targetType: 'maintenance' })

  const page = Number(searchParams?.page ?? '1')
  const result = await getMaintenanceRows({ page: Number.isFinite(page) ? page : 1, pageSize: PAGE_SIZE })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance drill-down</h1>
          <p className="text-sm text-muted-foreground">Prioritize open requests and dispatch assignments.</p>
        </div>
        <Link href="/api/exports/maintenance" className="text-sm underline">Export CSV</Link>
      </div>
      <DomainTable
        title="Maintenance queue"
        description="Open requests sorted by urgency and recency."
        columns={['Request ID', 'Title', 'Priority', 'Status', 'Unit', 'Updated at']}
        rows={result.rows.map((row) => [row.request_id, row.title, row.priority, row.status, row.unit, new Date(row.updated_at).toLocaleString()])}
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
