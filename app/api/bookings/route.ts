import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  buildBlackoutConflictMessage,
  ensureAmenityIsBookable,
  type AmenityBlackout,
} from '@/lib/amenities/blackouts'
import { BookingBlackoutError } from '@/lib/errors'
import { createClient } from '@/utils/supabase/server'

const bookingSchema = z
  .object({
    amenityId: z.string().min(1, 'Amenity is required.'),
    startsAt: z.coerce.date({
      errorMap: () => ({ message: 'Provide a valid start date and time.' }),
    }),
    endsAt: z.coerce.date({
      errorMap: () => ({ message: 'Provide a valid end date and time.' }),
    }),
    note: z
      .string()
      .max(280, 'Notes should be 280 characters or fewer.')
      .optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'The booking end time must be after the start time.',
    path: ['endsAt'],
  })

export async function POST(request: Request) {
  const supabase = createClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON body.', details: 'Expected a JSON payload for the booking request.' },
      { status: 400 }
    )
  }

  const parsed = bookingSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid booking request.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    )
  }

  const { amenityId, startsAt, endsAt, note } = parsed.data
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  try {
    await ensureAmenityIsBookable(supabase, {
      amenityId,
      startsAt,
      endsAt,
    })
  } catch (error) {
    if (error instanceof BookingBlackoutError) {
      const blackoutDetails = error.blackout as AmenityBlackout | undefined
      return NextResponse.json(
        {
          error: 'Amenity blackout conflict.',
          message: blackoutDetails
            ? buildBlackoutConflictMessage(blackoutDetails)
            : error.message,
          blackout: blackoutDetails ?? null,
        },
        { status: 409 }
      )
    }

    console.error('Unexpected booking validation error', error)
    return NextResponse.json(
      { error: 'Unable to validate amenity availability at this time.' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      status: 'ok',
      message: 'Booking permitted. Continue with the reservation workflow.',
      note,
    },
    { status: 200 }
  )
}
