import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { requirePrivilegedApiAccess } from '@/lib/authz'
import { getFinanceRows, toCsv } from '@/lib/operations/data'

export async function GET() {
  const auth = await requirePrivilegedApiAccess()
  if ('response' in auth) return auth.response

  const csv = toCsv((await getFinanceRows({ page: 1, pageSize: 1000 })).rows)
  await writeAuditRecord({ action: 'operations.export.csv.finance', actorId: auth.user.id, actorRole: auth.role, targetType: 'finance_export' })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="finance-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
