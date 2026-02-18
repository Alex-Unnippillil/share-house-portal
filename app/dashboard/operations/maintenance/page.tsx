import Link from 'next/link'

import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getMaintenanceRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

export default async function MaintenanceOperationsPage() {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.maintenance.view', actorId: user.id, actorRole: role, targetType: 'maintenance' })

  const rows = await getMaintenanceRows()

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        rows={rows.map((row) => [row.request_id, row.title, row.priority, row.status, row.unit, new Date(row.updated_at).toLocaleString()])}
      />
    </div>
  )
}
