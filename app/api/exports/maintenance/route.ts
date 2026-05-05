import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { fetchMemberRole } from '@/lib/data/members'
import { getMaintenanceRows, toCsv } from '@/lib/operations/data'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'
import { isPrivilegedRole, type TypedSupabaseClient } from '@/utils/typed-supabase-client'

export async function GET() {
  const supabase = (await createSupbaseServerClientReadOnly()) as TypedSupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const role = await fetchMemberRole(supabase, user.id)
  if (!isPrivilegedRole(role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const csv = toCsv((await getMaintenanceRows({ page: 1, pageSize: 1000 })).rows)
  await writeAuditRecord({ action: 'operations.export.maintenance', actorId: user.id, actorRole: role, targetType: 'maintenance_export' })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="maintenance-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
