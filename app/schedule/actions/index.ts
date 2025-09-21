'use server'

import { createCalBooking } from '@/lib/calcom'
import { type Database } from '@/lib/supabase'
import { createClient } from '@/utils/supa-server-actions'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

export type ActionResponse = {
  status: 'idle' | 'success' | 'error'
  message?: string
  error?: string
  bookingUrl?: string
}

export const initialActionState: ActionResponse = { status: 'idle' }

const noteSchema = z
  .string()
  .trim()
  .max(500, 'Notes must be 500 characters or less')

const isoDateTimeSchema = z.string().datetime({ offset: true })

const baseReservationSchema = z.object({
  amenitySlug: z.string().min(1, 'Amenity is required'),
  note: noteSchema.optional(),
})

const embedReservationSchema = z.object({
  amenitySlug: z.string().min(1),
  calBookingId: z.string().min(1),
  startTime: isoDateTimeSchema,
  endTime: isoDateTimeSchema,
  bookingUrl: z.string().url().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  metadata: z.record(z.any()).optional(),
  rawPayload: z.unknown().optional(),
})

const overnightRequestSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required').max(120),
  guestEmail: z.string().email().optional(),
  startDate: z.string().min(1, 'Arrival date is required'),
  endDate: z.string().min(1, 'Departure date is required'),
  notes: noteSchema.optional(),
})

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value ?? null))
  } catch {
    return null
  }
}

async function getSupabaseClient() {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

async function getCurrentUser() {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('You must be logged in to reserve amenities')
  }

  return { supabase, user }
}

function parseSlot(slotValue: FormDataEntryValue | null) {
  if (!slotValue || typeof slotValue !== 'string') {
    throw new Error('A valid time slot must be selected')
  }

  const [startTime, endTime] = slotValue.split('|')
  const startResult = isoDateTimeSchema.safeParse(startTime)
  const endResult = isoDateTimeSchema.safeParse(endTime)

  if (!startResult.success || !endResult.success) {
    throw new Error('Invalid slot information received from the form')
  }

  if (new Date(startResult.data) >= new Date(endResult.data)) {
    throw new Error('End time must be after the start time')
  }

  return { startTime: startResult.data, endTime: endResult.data }
}

async function assertNoConflicts(
  supabase: ReturnType<typeof createClient>,
  amenityId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
) {
  const conflictQuery = supabase
    .from('amenity_reservations')
    .select('id, cal_booking_id, start_time, end_time, status')
    .eq('amenity_id', amenityId)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (excludeBookingId) {
    conflictQuery.neq('cal_booking_id', excludeBookingId)
  }

  const { data: conflicts, error: conflictError } = await conflictQuery

  if (conflictError) {
    throw new Error('Unable to verify availability. Please try again later.')
  }

  if (conflicts && conflicts.length > 0) {
    throw new Error('Another reservation already exists in that time window')
  }
}

export async function reserveAmenityAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { supabase, user } = await getCurrentUser()

    const rawData = baseReservationSchema.safeParse({
      amenitySlug: formData.get('amenitySlug'),
      note: formData.get('note') ?? undefined,
    })

    if (!rawData.success) {
      return {
        status: 'error',
        error: rawData.error.issues.map((issue) => issue.message).join('. '),
      }
    }

    const { startTime, endTime } = parseSlot(formData.get('slot'))

    const {
      data: amenity,
      error: amenityError,
    } = await supabase
      .from('amenities')
      .select('*')
      .eq('slug', rawData.data.amenitySlug)
      .maybeSingle()

    if (amenityError) {
      return { status: 'error', error: 'Unable to load amenity details' }
    }

    if (!amenity) {
      return { status: 'error', error: 'Amenity is not configured' }
    }

    await assertNoConflicts(supabase, amenity.id, startTime, endTime)

    const booking = await createCalBooking({
      eventTypeSlug: amenity.cal_event_type,
      startTime,
      endTime,
      email: user.email ?? '',
      name: user.user_metadata?.full_name ?? user.email ?? 'Resident',
      metadata: {
        userId: user.id,
        amenityId: amenity.id,
        note: rawData.data.note,
        source: 'portal',
      },
    })

    const { error: insertError } = await supabase.from('amenity_reservations').insert({
      amenity_id: amenity.id,
      user_id: user.id,
      cal_booking_id: booking.id,
      cal_booking_url: booking.bookingUrl ?? null,
      start_time: startTime,
      end_time: endTime,
      status: booking.status,
      metadata: {
        note: rawData.data.note ?? null,
        calResponses: safeJson(booking.responses) ?? {},
        source: 'manual',
      } satisfies Database["public"]["Tables"]["amenity_reservations"]["Row"]["metadata"],
    })

    if (insertError) {
      return { status: 'error', error: 'Reservation created but failed to save locally' }
    }

    revalidatePath('/schedule')

    return {
      status: 'success',
      message: 'Reservation confirmed! You will receive a confirmation email shortly.',
      bookingUrl: booking.bookingUrl,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reserve amenity'
    return { status: 'error', error: message }
  }
}

export async function syncCalBookingAction(input: unknown): Promise<ActionResponse> {
  try {
    const parsed = embedReservationSchema.safeParse(input)

    if (!parsed.success) {
      return {
        status: 'error',
        error: parsed.error.issues.map((issue) => issue.message).join('. '),
      }
    }

    const { supabase, user } = await getCurrentUser()

    const {
      data: amenity,
      error: amenityError,
    } = await supabase
      .from('amenities')
      .select('*')
      .eq('slug', parsed.data.amenitySlug)
      .maybeSingle()

    if (amenityError || !amenity) {
      return { status: 'error', error: 'Amenity is not configured for Cal.com syncing' }
    }

    await assertNoConflicts(
      supabase,
      amenity.id,
      parsed.data.startTime,
      parsed.data.endTime,
      parsed.data.calBookingId
    )

    const { error: upsertError } = await supabase.from('amenity_reservations').upsert(
      {
        amenity_id: amenity.id,
        user_id: user.id,
        cal_booking_id: parsed.data.calBookingId,
        cal_booking_url: parsed.data.bookingUrl ?? null,
        start_time: parsed.data.startTime,
        end_time: parsed.data.endTime,
        status: parsed.data.status ?? 'pending',
        metadata: {
          source: 'cal-embed',
          raw: safeJson(parsed.data.rawPayload),
          syncMetadata: safeJson(parsed.data.metadata) ?? {},
        } satisfies Database["public"]["Tables"]["amenity_reservations"]["Row"]["metadata"],
      },
      { onConflict: 'cal_booking_id' }
    )

    if (upsertError) {
      return { status: 'error', error: 'Unable to sync Cal.com booking with Supabase' }
    }

    revalidatePath('/schedule')

    return { status: 'success', message: 'Cal.com booking synced successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync booking'
    return { status: 'error', error: message }
  }
}

export async function requestOvernightVisitAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { supabase, user } = await getCurrentUser()

    const parsed = overnightRequestSchema.safeParse({
      guestName: formData.get('guestName'),
      guestEmail: formData.get('guestEmail') ?? undefined,
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      notes: formData.get('notes') ?? undefined,
    })

    if (!parsed.success) {
      return {
        status: 'error',
        error: parsed.error.issues.map((issue) => issue.message).join('. '),
      }
    }

    const startDate = parsed.data.startDate
    const endDate = parsed.data.endDate

    if (new Date(startDate) > new Date(endDate)) {
      return {
        status: 'error',
        error: 'The departure date must be on or after the arrival date.',
      }
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from('overnight_visits')
      .select('id, status, start_date, end_date')
      .eq('resident_id', user.id)
      .in('status', ['pending', 'approved'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)

    if (conflictError) {
      return {
        status: 'error',
        error: 'Unable to verify existing overnight requests right now.',
      }
    }

    if (conflicts && conflicts.length > 0) {
      return {
        status: 'error',
        error: 'You already have an overlapping overnight request pending or approved.',
      }
    }

    const { error: insertError } = await supabase.from('overnight_visits').insert({
      resident_id: user.id,
      guest_name: parsed.data.guestName,
      guest_email: parsed.data.guestEmail ?? null,
      start_date: startDate,
      end_date: endDate,
      notes: parsed.data.notes ?? null,
      status: 'pending',
    } satisfies Database["public"]["Tables"]["overnight_visits"]["Insert"])

    if (insertError) {
      return {
        status: 'error',
        error: 'Unable to submit overnight visit request. Please try again later.',
      }
    }

    revalidatePath('/schedule')

    return {
      status: 'success',
      message: 'Overnight visit request submitted. You will be notified once it is reviewed.',
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Something went wrong while submitting the overnight request.'
    return { status: 'error', error: message }
  }
}
