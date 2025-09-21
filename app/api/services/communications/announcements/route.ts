import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supa-server-actions'
import {
  createAnnouncement,
  deleteAnnouncement,
  getRequestContext,
  listAnnouncements,
  normalizeError,
  updateAnnouncement,
  type AnnouncementStatus,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from '@/services/communications'

const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = [
  'draft',
  'scheduled',
  'published',
  'archived',
]

function toErrorResponse(error: unknown) {
  const normalized = normalizeError(error)

  return NextResponse.json(
    { error: normalized.message, details: normalized.details },
    { status: normalized.status },
  )
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const { searchParams } = new URL(request.url)

    const statusParam = searchParams.get('status')
    let status: AnnouncementStatus | undefined

    if (statusParam) {
      if (!ANNOUNCEMENT_STATUSES.includes(statusParam as AnnouncementStatus)) {
        return NextResponse.json(
          { error: 'Invalid announcement status filter' },
          { status: 400 },
        )
      }

      status = statusParam as AnnouncementStatus
    }

    const includeExpired = searchParams.get('includeExpired') === 'true'
    const limitParam = searchParams.get('limit')
    let limit: number | undefined

    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10)

      if (Number.isNaN(parsedLimit)) {
        return NextResponse.json(
          { error: 'Limit must be a number' },
          { status: 400 },
        )
      }

      limit = parsedLimit
    }

    const announcements = await listAnnouncements(supabase, context, {
      status,
      includeExpired,
      limit,
    })

    return NextResponse.json({ data: announcements })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as CreateAnnouncementInput

    if (!body?.title || !body?.body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 },
      )
    }

    if (body.status && !ANNOUNCEMENT_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid announcement status provided' },
        { status: 400 },
      )
    }

    const announcement = await createAnnouncement(supabase, context, body)

    return NextResponse.json({ data: announcement }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as UpdateAnnouncementInput

    if (!body?.id) {
      return NextResponse.json(
        { error: 'Announcement id is required' },
        { status: 400 },
      )
    }

    if (body.status && !ANNOUNCEMENT_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid announcement status provided' },
        { status: 400 },
      )
    }

    const announcement = await updateAnnouncement(supabase, context, body)

    return NextResponse.json({ data: announcement })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as { id?: number }

    if (!body?.id) {
      return NextResponse.json(
        { error: 'Announcement id is required' },
        { status: 400 },
      )
    }

    const announcement = await deleteAnnouncement(supabase, context, body.id)

    return NextResponse.json({ data: announcement })
  } catch (error) {
    return toErrorResponse(error)
  }
}
