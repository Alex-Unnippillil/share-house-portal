import { NextResponse } from 'next/server'
import type { DocumentVisibility } from '@/web/features/documents/types'
import { buildDocumentReport, documentReportToCsv } from '@/web/features/documents/reporting'
import { createSupabaseRouteClient, getCurrentUserWithProfile, mapDocument } from '../helpers'

export async function GET(request: Request) {
  const supabase = createSupabaseRouteClient()
  const { user, profile, error } = await getCurrentUserWithProfile(supabase)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if ((profile?.role ?? 'user').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const categoryFilters = url.searchParams.getAll('category')
  const visibilityFilters = url.searchParams.getAll('visibility') as DocumentVisibility[]
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  const format = url.searchParams.get('format') ?? 'json'

  const { data, error: documentError } = await supabase
    .from('documents')
    .select(
      `id, name, category_id, storage_path, file_size, visibility, allowed_roles, allowed_users, uploaded_by, created_at, updated_at,
      category:document_categories(id, name, description, visibility, allowed_roles, created_at, updated_at),
      uploader:profiles(id, full_name, email, role)`,
    )
    .order('created_at', { ascending: false })

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 500 })
  }

  const report = buildDocumentReport((data ?? []).map(mapDocument), {
    categoryIds: categoryFilters.length ? categoryFilters : undefined,
    visibility: visibilityFilters.length ? visibilityFilters : undefined,
    startDate: start ? new Date(start) : undefined,
    endDate: end ? new Date(end) : undefined,
  })

  if (format === 'csv') {
    const csv = documentReportToCsv(report)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="documents-report-${Date.now()}.csv"`,
      },
    })
  }

  return NextResponse.json({ report })
}
