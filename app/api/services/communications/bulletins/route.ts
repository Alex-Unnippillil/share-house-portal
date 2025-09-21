import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supa-server-actions'
import {
  createBulletin,
  deleteBulletin,
  getRequestContext,
  listBulletins,
  moderateBulletin,
  normalizeError,
  reportBulletinAbuse,
  type BulletinStatus,
  type CreateBulletinInput,
  type ModerationStatus,
  type ModerateBulletinInput,
} from '@/services/communications'

const BULLETIN_STATUSES: BulletinStatus[] = [
  'pending',
  'approved',
  'rejected',
  'escalated',
  'archived',
]

const MODERATION_STATUSES: ModerationStatus[] = [
  'clean',
  'under_review',
  'action_required',
  'resolved',
]

const MODERATION_ACTIONS: ModerateBulletinInput['action'][] = [
  'approve',
  'reject',
  'escalate',
  'resolve',
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
    let status: BulletinStatus | undefined

    if (statusParam) {
      if (!BULLETIN_STATUSES.includes(statusParam as BulletinStatus)) {
        return NextResponse.json(
          { error: 'Invalid bulletin status filter' },
          { status: 400 },
        )
      }

      status = statusParam as BulletinStatus
    }

    const moderationParam = searchParams.get('moderationStatus')
    let moderationStatus: ModerationStatus | undefined

    if (moderationParam) {
      if (
        !MODERATION_STATUSES.includes(moderationParam as ModerationStatus)
      ) {
        return NextResponse.json(
          { error: 'Invalid moderation status filter' },
          { status: 400 },
        )
      }

      moderationStatus = moderationParam as ModerationStatus
    }

    const mineOnly = searchParams.get('mineOnly') === 'true'
    const includeAbuse = searchParams.get('includeAbuse') === 'true'

    const result = await listBulletins(supabase, context, {
      status,
      moderationStatus,
      mineOnly,
      includeAbuse,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const rawBody = (await request.json()) as Record<string, unknown> | null

    if (rawBody?.action === 'report') {
      if (
        typeof rawBody.bulletinId !== 'number' ||
        rawBody.bulletinId <= 0 ||
        typeof rawBody.reason !== 'string' ||
        rawBody.reason.trim().length === 0
      ) {
        return NextResponse.json(
          { error: 'Bulletin id and reason are required to report abuse' },
          { status: 400 },
        )
      }

      const report = await reportBulletinAbuse(supabase, context, {
        bulletinId: rawBody.bulletinId,
        reason: rawBody.reason,
        details:
          typeof rawBody.details === 'string' ? rawBody.details : undefined,
      })

      return NextResponse.json({ data: report }, { status: 201 })
    }

    if (
      !rawBody ||
      typeof rawBody.title !== 'string' ||
      rawBody.title.trim().length === 0 ||
      typeof rawBody.content !== 'string' ||
      rawBody.content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 },
      )
    }

    const bulletinInput: CreateBulletinInput = {
      title: rawBody.title,
      content: rawBody.content,
    }

    const bulletin = await createBulletin(supabase, context, bulletinInput)

    return NextResponse.json({ data: bulletin }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as ModerateBulletinInput

    if (!body?.bulletinId || !body.action) {
      return NextResponse.json(
        { error: 'Bulletin id and action are required' },
        { status: 400 },
      )
    }

    if (!MODERATION_ACTIONS.includes(body.action)) {
      return NextResponse.json(
        { error: 'Unsupported moderation action' },
        { status: 400 },
      )
    }

    await moderateBulletin(supabase, context, body)

    return NextResponse.json({ success: true })
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
        { error: 'Bulletin id is required' },
        { status: 400 },
      )
    }

    const bulletin = await deleteBulletin(supabase, context, body.id)

    return NextResponse.json({ data: bulletin })
  } catch (error) {
    return toErrorResponse(error)
  }
}
