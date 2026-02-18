import Link from 'next/link'

import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getBookingRows } from '@/lib/operations/data'

import { DomainTable } from '../components/domain-table'

export default async function BookingOperationsPage() {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({ action: 'operations.bookings.view', actorId: user.id, actorRole: role, targetType: 'bookings' })

  const rows = await getBookingRows()

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        rows={rows.map((row) => [row.booking_id, row.amenity, row.unit, row.status, new Date(row.start_time).toLocaleString(), new Date(row.end_time).toLocaleString()])}
      />
    </div>
  )
}
