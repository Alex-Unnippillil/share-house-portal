import Link from 'next/link'

import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getFinanceRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

export default async function FinanceOperationsPage() {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.finance.view', actorId: user.id, actorRole: role, targetType: 'finance' })

  const rows = await getFinanceRows()

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finance drill-down</h1>
          <p className="text-sm text-muted-foreground">Track rent payment outcomes and export reconciliations.</p>
        </div>
        <Link href="/api/exports/finance" className="text-sm underline">Export CSV</Link>
      </div>
      <DomainTable
        title="Payment operations"
        description="Failed and pending entries should be reconciled daily."
        columns={['Payment ID', 'Tenant', 'Unit', 'Amount', 'Status', 'Processed at']}
        rows={rows.map((row) => [row.payment_id, row.tenant, row.unit, `$${row.amount}`, row.status, new Date(row.processed_at).toLocaleString()])}
      />
    </div>
  )
}
