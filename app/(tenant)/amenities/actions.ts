'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  addMinutes,
  differenceInMinutes,
  endOfDay,
  isBefore,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
} from 'date-fns'

import { createClient } from '@/utils/supa-server-actions'
import type {
  Amenity,
  AmenityReservation,
  AmenityReservationStatus,
  TypedSupabaseClient,
} from '@/utils/typed-supabase-client'

const SLOT_DURATION_MINUTES = 60
const OPERATING_HOURS = { start: 8, end: 22 }
const BLOCKING_STATUSES: AmenityReservationStatus[] = ['pending', 'approved']

type ReservationPreview = Pick<AmenityReservation, 'id' | 'start_at' | 'end_at' | 'status'>
type ReservationWindow = Pick<AmenityReservation, 'start_at' | 'end_at'>

const availabilitySchema = z.object({
  amenityId: z.string().uuid(),
  date: z.coerce.date(),
})

const reservationSchema = z
  .object({
    amenityId: z.string().uuid(),
    start: z.coerce.date(),
    end: z.coerce.date(),
    notes: z
      .string()
      .max(500, 'Notes must be 500 characters or fewer.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((data) => data.end > data.start, {
    message: 'Reservation end time must be after the start time.',
    path: ['end'],
  })

export type AvailabilitySlot = {
  start: string
  end: string
}

export type AvailabilityResult = {
  slots: AvailabilitySlot[]
  reservations: ReservationPreview[]
}

export type ReservationResult = {
  success: boolean
  error?: string
  reservationId?: string
}

function getSupabaseClient(): TypedSupabaseClient {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

function normalizeToHour(date: Date, hour: number): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hour), 0), 0), 0)
}

function buildDailyWindow(date: Date): { windowStart: Date; windowEnd: Date } {
  const windowStart = normalizeToHour(startOfDay(date), OPERATING_HOURS.start)
  const windowEnd = normalizeToHour(startOfDay(date), OPERATING_HOURS.end)
  return { windowStart, windowEnd }
}

function slotOverlaps(slotStart: Date, slotEnd: Date, reservation: ReservationWindow): boolean {
  const reservationStart = new Date(reservation.start_at)
  const reservationEnd = new Date(reservation.end_at)
  return reservationStart < slotEnd && reservationEnd > slotStart
}

async function ensureAuthenticated(client: TypedSupabaseClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user) {
    throw new Error('You must be signed in to manage amenity reservations.')
  }

  return user
}

export async function getAmenityCatalog(): Promise<Amenity[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to load amenities', error)
    return []
  }

  return data ?? []
}

export async function getAmenityAvailability(
  input: z.infer<typeof availabilitySchema>
): Promise<AvailabilityResult> {
  const supabase = getSupabaseClient()
  const { amenityId, date } = availabilitySchema.parse(input)

  const { data: amenity, error: amenityError } = await supabase
    .from('amenities')
    .select('*')
    .eq('id', amenityId)
    .maybeSingle()

  if (amenityError) {
    console.error('Failed to load amenity for availability check', amenityError)
    throw new Error('Unable to load the selected amenity.')
  }

  if (!amenity || !amenity.is_active) {
    return { slots: [], reservations: [] }
  }

  const { windowStart, windowEnd } = buildDailyWindow(date)
  const windowClose = endOfDay(windowEnd)

  const { data: reservationRows, error } = await supabase
    .from('amenity_reservations')
    .select('id,start_at,end_at,status')
    .eq('amenity_id', amenityId)
    .in('status', BLOCKING_STATUSES)
    .gte('end_at', windowStart.toISOString())
    .lt('start_at', windowClose.toISOString())

  if (error) {
    console.error('Failed to load reservations for amenity', error)
    throw new Error('Unable to load reservations for the selected date.')
  }

  const slots: AvailabilitySlot[] = []
  const now = new Date()
  const reservations = (reservationRows ?? []) as ReservationPreview[]

  for (
    let current = new Date(windowStart);
    current < windowEnd;
    current = addMinutes(current, SLOT_DURATION_MINUTES)
  ) {
    const slotStart = current
    const slotEnd = addMinutes(slotStart, SLOT_DURATION_MINUTES)

    if (slotEnd > windowEnd) {
      break
    }

    if (isBefore(slotEnd, now)) {
      continue
    }

    const hasConflict = reservations.some((reservation) =>
      slotOverlaps(slotStart, slotEnd, reservation)
    )

    if (!hasConflict) {
      slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() })
    }
  }

  return {
    slots,
    reservations,
  }
}

export async function createAmenityReservation(
  input: z.infer<typeof reservationSchema>
): Promise<ReservationResult> {
  const supabase = getSupabaseClient()
  const user = await ensureAuthenticated(supabase)
  const { amenityId, start, end, notes } = reservationSchema.parse(input)

  if (differenceInMinutes(end, start) !== SLOT_DURATION_MINUTES) {
    return {
      success: false,
      error: `Reservations must be booked in ${SLOT_DURATION_MINUTES}-minute increments.`,
    }
  }

  const now = new Date()
  if (isBefore(end, now)) {
    return { success: false, error: 'Cannot book an amenity in the past.' }
  }

  const { windowStart, windowEnd } = buildDailyWindow(start)
  if (isBefore(start, windowStart) || !isBefore(start, windowEnd)) {
    return {
      success: false,
      error: 'Reservation must be within the amenity operating hours.',
    }
  }

  const { slots } = await getAmenityAvailability({ amenityId, date: start })

  const slotAllowed = slots.some((slot) => slot.start === start.toISOString())

  if (!slotAllowed) {
    return {
      success: false,
      error: 'The selected time is no longer available. Please choose another slot.',
    }
  }

  const { error, data } = await supabase
    .from('amenity_reservations')
    .insert({
      amenity_id: amenityId,
      lease_id: user.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      notes,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create amenity reservation', error)
    return {
      success: false,
      error: 'We were unable to save your reservation. Please try again.',
    }
  }

  revalidatePath('/amenities')
  revalidatePath('/dashboard/amenities')

  return { success: true, reservationId: data?.id ?? undefined }
}

export const SLOT_LENGTH_MINUTES = SLOT_DURATION_MINUTES
export const OPERATING_WINDOW = OPERATING_HOURS
export const BLOCKING_RESERVATION_STATUSES = BLOCKING_STATUSES
