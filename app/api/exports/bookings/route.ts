import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { fetchMemberRole } from '@/lib/data/members'
import { getBookingRows, toCsv } from '@/lib/operations/data'
import { createSupabaseServerClientReadOnly } from '@/utils/supaone'

export async function GET() {
  const supabase = await createSupabaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const role = await fetchMemberRole(supabase as any, user.id)
  if (role !== 'property_manager' && role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const csv = toCsv((await getBookingRows({ page: 1, pageSize: 1000 })).rows)
  await writeAuditRecord({ action: 'operations.export.bookings', actorId: user.id, actorRole: role, targetType: 'bookings_export' })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
