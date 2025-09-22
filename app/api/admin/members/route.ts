import { NextRequest, NextResponse } from 'next/server'

import { queryMembers, type MemberRecord } from '@/lib/mock-admin-data'

type SortableMemberColumn = keyof Pick<
  MemberRecord,
  'name' | 'role' | 'joinedAt' | 'status' | 'email'
>

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '50', 10)
  const sortBy = searchParams.get('sortBy') as SortableMemberColumn | null
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
  const search = searchParams.get('q') ?? undefined

  const safeSortBy: SortableMemberColumn | undefined = sortBy ?? undefined

  const { rows, total } = queryMembers({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50,
    sortBy: safeSortBy,
    sortDir,
    search,
  })

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
  })
}
