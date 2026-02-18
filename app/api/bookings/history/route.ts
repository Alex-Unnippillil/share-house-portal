import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

const MAX_LIMIT = 50

function parseLimit(value: string | null) {
  const parsed = Number(value ?? '20')
  if (!Number.isFinite(parsed)) return 20
  return Math.min(Math.max(parsed, 1), MAX_LIMIT)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get('limit'))
  const cursor = searchParams.get('cursor')

  const supabase = createClient()
  let query = supabase
    .from('bookings')
    .select('id, property_id, amenity_name, status, start_time, end_time', { count: 'exact' })
    .order('start_time', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('start_time', cursor)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const nextCursor = rows.length === limit ? rows[rows.length - 1]?.start_time ?? null : null

  return NextResponse.json(
    {
      rows,
      nextCursor,
      totalRows: count ?? 0,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
