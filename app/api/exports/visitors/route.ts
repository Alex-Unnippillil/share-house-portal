import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { fetchMemberRole } from '@/lib/data/members'
import { getVisitorRows, toCsv } from '@/lib/operations/data'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export async function GET() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const role = await fetchMemberRole(supabase as any, user.id)
  if (role !== 'property_manager' && role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const csv = toCsv((await getVisitorRows({ page: 1, pageSize: 1000 })).rows)
  await writeAuditRecord({ action: 'operations.export.visitors', actorId: user.id, actorRole: role, targetType: 'visitors_export' })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="visitor-logs-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
