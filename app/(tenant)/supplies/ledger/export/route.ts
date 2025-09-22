import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  LedgerDataError,
  getSupplyLedgerData,
  supplyLedgerToCsv,
} from '@/lib/supplies/ledger'

const exportQuerySchema = z.object({
  month: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const potentialFilters = {
    month: searchParams.get('month') ?? undefined,
  }

  try {
    const filters = exportQuerySchema.parse(potentialFilters)
    const ledger = await getSupplyLedgerData(filters)
    const csv = supplyLedgerToCsv(ledger.entries)
    const filename = `supply-ledger${filters.month ? `-${filters.month}` : ''}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid filter parameters.' }, { status: 400 })
    }

    if (error instanceof LedgerDataError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: 'Failed to export the supply ledger. Please try again.' },
      { status: 500 }
    )
  }
}
