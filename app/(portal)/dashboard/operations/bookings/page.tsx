import Link from 'next/link'

import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getBookingRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

const PAGE_SIZE = 25

function buildPageHref(page: number) {
  return `/dashboard/operations/bookings?page=${page}`
}

export default async function BookingOperationsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.bookings.view', actorId: user.id, actorRole: role, targetType: 'bookings' })

  const page = Number(searchParams?.page ?? '1')
  const result = await getBookingRows({ page: Number.isFinite(page) ? page : 1, pageSize: PAGE_SIZE })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bookings drill-down</h1>
          <p className="text-sm text-muted-foreground">Monitor amenity utilization and pending approvals.</p>
        </div>
        <Link href="/api/exports/bookings" className="text-sm underline">Export CSV</Link>
      </div>
      <DomainTable
        title="Amenity booking ledger"
        description="Confirmed events contribute to utilization KPIs."
        columns={['Booking ID', 'Amenity', 'Unit', 'Status', 'Start', 'End']}
        rows={result.rows.map((row) => [row.booking_id, row.amenity, row.unit, row.status, new Date(row.start_time).toLocaleString(), new Date(row.end_time).toLocaleString()])}
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
