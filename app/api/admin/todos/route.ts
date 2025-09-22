import { NextRequest, NextResponse } from 'next/server'

import { queryTodos, type TodoRecord } from '@/lib/mock-admin-data'

type SortableTodoColumn = keyof Pick<
  TodoRecord,
  'title' | 'status' | 'createdAt' | 'createdBy'
>

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '50', 10)
  const sortBy = searchParams.get('sortBy') as SortableTodoColumn | null
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
  const search = searchParams.get('q') ?? undefined

  const { rows, total } = queryTodos({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50,
    sortBy: sortBy ?? undefined,
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
