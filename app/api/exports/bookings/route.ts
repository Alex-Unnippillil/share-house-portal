import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { requirePrivilegedApiAccess } from '@/lib/authz'
import { getBookingRows, toCsv } from '@/lib/operations/data'

export async function GET() {
  const auth = await requirePrivilegedApiAccess()
  if ('response' in auth) return auth.response

  const csv = toCsv((await getBookingRows({ page: 1, pageSize: 1000 })).rows)
  await writeAuditRecord({ action: 'operations.export.csv.bookings', actorId: auth.user.id, actorRole: auth.role, targetType: 'bookings_export' })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
