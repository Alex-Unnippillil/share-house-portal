import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { SupabaseBookingRepository } from '@/lib/bookings/repository'
import type { CheckInMethod } from '@/lib/bookings/types'
import { createServiceRoleSupabaseClient } from '@/lib/supabase-admin'
import useSupabaseServer from '@/utils/supabase-server'

const paramsSchema = z.object({
  bookingId: z.string().uuid(),
})

const bodySchema = z
  .object({
    method: z.enum(['button', 'presence']).optional(),
  })
  .default({})

export async function POST(request: Request, context: { params: { bookingId: string } }) {
  const { params } = context

  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid booking id.' }, { status: 400 })
  }

  const bookingId = parsedParams.data.bookingId

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const parsedBody = bodySchema.safeParse(payload ?? {})
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body.',
        details: parsedBody.error.flatten(),
      },
      { status: 400 },
    )
  }

  const method: CheckInMethod = parsedBody.data.method ?? 'button'

  const cookieStore = cookies()
  const supabase = useSupabaseServer(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceRoleSupabaseClient()
  const repository = new SupabaseBookingRepository(serviceClient)

  try {
    const booking = await repository.getBookingById(bookingId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    if (booking.member_id !== user.id) {
      return NextResponse.json({ error: 'You are not allowed to check in to this booking.' }, { status: 403 })
    }

    if (booking.status === 'no_show_cancelled' || booking.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot check in to a booking with status "${booking.status}".` },
        { status: 409 },
      )
    }

    if (booking.status === 'checked_in' && booking.check_in_at) {
      return NextResponse.json({ status: 'checked_in', checkInAt: booking.check_in_at })
    }

    const now = new Date()
    await repository.markCheckedIn(booking.id, now)
    await repository.logEvent({
      bookingId: booking.id,
      memberId: booking.member_id,
      eventType: 'booking.checked_in',
      metadata: {
        check_in_at: now.toISOString(),
        method,
      },
    })

    return NextResponse.json({ status: 'checked_in', checkInAt: now.toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
