import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { fetchMemberRole } from '@/lib/data/members'
import { getMaintenanceRows, toCsv } from '@/lib/operations/data'
import { consumeRateLimit, createRateLimitResponse, getRateLimitKeyFromRequest } from '@/lib/rate-limit'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export async function GET(req: Request) {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const role = await fetchMemberRole(supabase as any, user.id)
  if (role !== 'property_manager' && role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const rateLimit = consumeRateLimit({
    bucket: 'api:exports:maintenance',
    key: getRateLimitKeyFromRequest(req, `user:${user.id}`),
    limit: 5,
    windowMs: 60_000,
  })

  if (!rateLimit.ok) {
    return createRateLimitResponse(rateLimit)
  }

  const rows = (await getMaintenanceRows({ page: 1, pageSize: 1000 })).rows
  const csv = toCsv(rows)
  const exportedAt = new Date().toISOString()

  await writeAuditRecord({
    action: 'operations.export.maintenance',
    actorId: user.id,
    actorRole: role,
    targetType: 'maintenance_export',
    metadata: {
      scope: 'maintenance',
      rowCount: rows.length,
      exportedAt,
    },
  })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="maintenance-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
