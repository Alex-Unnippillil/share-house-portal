import Link from 'next/link'

import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getFinanceRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

const PAGE_SIZE = 25

function buildPageHref(page: number) {
  return `/dashboard/operations/finance?page=${page}`
}

export default async function FinanceOperationsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.finance.view', actorId: user.id, actorRole: role, targetType: 'finance' })

  const page = Number(searchParams?.page ?? '1')
  const result = await getFinanceRows({ page: Number.isFinite(page) ? page : 1, pageSize: PAGE_SIZE })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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
        rows={result.rows.map((row) => [row.payment_id, row.tenant, row.unit, `$${row.amount}`, row.status, new Date(row.processed_at).toLocaleString()])}
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
