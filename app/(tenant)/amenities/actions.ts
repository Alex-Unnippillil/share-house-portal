'use server'

import { addMinutes, isBefore, isPast, setHours, setMilliseconds, setMinutes, setSeconds, startOfDay } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { Database } from '@/lib/supabase'
import { createSupbaseServerClient } from '@/utils/supaone'

const availabilitySchema = z.object({
  amenityId: z.string().uuid(),
  date: z.coerce.date(),
  slotMinutes: z.number().int().positive().max(12 * 60).default(60),
  openHour: z.number().int().min(0).max(23).default(8),
  closeHour: z.number().int().min(1).max(24).default(22),
})

const reservationSchema = z.object({
  amenityId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
})

const catalogSchema = z
  .object({
    includeInactive: z.boolean().optional(),
  })
  .optional()

type Amenity = Database['public']['Tables']['amenities']['Row']
type AmenityReservation = Database['public']['Tables']['amenity_reservations']['Row']

export async function fetchAmenityCatalog(params?: z.input<typeof catalogSchema>) {
  const options = catalogSchema.parse(params)
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to view amenities.')
  }

  let query = supabase.from('amenities').select('*').order('name', { ascending: true })

  if (!options?.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch amenities', error)
    throw new Error('Unable to load amenities right now.')
  }

  return data as Amenity[]
}

export async function getAmenityAvailability(rawInput: z.input<typeof availabilitySchema>) {
  const input = availabilitySchema.parse(rawInput)
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to view availability.')
  }

  const dayStart = startOfDay(input.date)
  const bookingWindowStart = setHours(setMinutes(setSeconds(setMilliseconds(dayStart, 0), 0), 0), input.openHour)
  const bookingWindowEnd = setHours(
    setMinutes(setSeconds(setMilliseconds(dayStart, 0), 0), 0),
    input.closeHour,
  )

  const activeStatuses = ['pending', 'approved'] as const

  const { data: reservations, error } = await supabase
    .from('amenity_reservations')
    .select('id,start_time,end_time,status')
    .eq('amenity_id', input.amenityId)
    .in('status', activeStatuses)
    .lt('start_time', bookingWindowEnd.toISOString())
    .gt('end_time', bookingWindowStart.toISOString())

  if (error) {
    console.error('Failed to load reservations for availability', error)
    throw new Error('Unable to compute availability for this amenity right now.')
  }

  const slots: { start: string; end: string }[] = []
  let current = bookingWindowStart

  while (isBefore(current, bookingWindowEnd)) {
    const slotEnd = addMinutes(current, input.slotMinutes)

    if (slotEnd > bookingWindowEnd) {
      break
    }

    const overlaps = (reservations ?? []).some((reservation) => {
      const reservationStart = new Date(reservation.start_time)
      const reservationEnd = new Date(reservation.end_time)

      return reservationStart < slotEnd && reservationEnd > current
    })

    const isSlotInPast = isPast(slotEnd)

    if (!overlaps && !isSlotInPast) {
      slots.push({ start: current.toISOString(), end: slotEnd.toISOString() })
    }

    current = addMinutes(current, input.slotMinutes)
  }

  return slots
}

interface ReservationResult {
  success: boolean
  message: string
  error?: string
}

export async function createAmenityReservation(rawInput: z.input<typeof reservationSchema>): Promise<ReservationResult> {
  const input = reservationSchema.parse(rawInput)
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: '', error: 'You must be signed in to reserve an amenity.' }
  }

  if (isBefore(input.endTime, input.startTime) || input.endTime.getTime() === input.startTime.getTime()) {
    return { success: false, message: '', error: 'End time must be after the start time.' }
  }

  if (isPast(input.startTime)) {
    return { success: false, message: '', error: 'You cannot reserve an amenity in the past.' }
  }

  const { data: amenity, error: amenityError } = await supabase
    .from('amenities')
    .select('id,is_active')
    .eq('id', input.amenityId)
    .maybeSingle()

  if (amenityError) {
    console.error('Failed to validate amenity before reservation', amenityError)
    return { success: false, message: '', error: 'Unable to validate amenity. Please try again.' }
  }

  if (!amenity || !amenity.is_active) {
    return { success: false, message: '', error: 'This amenity is not currently available for reservations.' }
  }

  const { data: conflictingReservations, error: conflictError } = await supabase
    .from('amenity_reservations')
    .select('id,start_time,end_time,status')
    .eq('amenity_id', input.amenityId)
    .in('status', ['pending', 'approved'])
    .lt('start_time', input.endTime.toISOString())
    .gt('end_time', input.startTime.toISOString())

  if (conflictError) {
    console.error('Failed to check reservation conflicts', conflictError)
    return { success: false, message: '', error: 'Could not verify availability. Please try again.' }
  }

  if ((conflictingReservations ?? []).length > 0) {
    return { success: false, message: '', error: 'That time slot has already been requested. Please choose another window.' }
  }

  const { error: insertError } = await supabase.from('amenity_reservations').insert({
    amenity_id: input.amenityId,
    lease_id: user.id,
    start_time: input.startTime.toISOString(),
    end_time: input.endTime.toISOString(),
    status: 'pending',
  })

  if (insertError) {
    console.error('Failed to create amenity reservation', insertError)
    return { success: false, message: '', error: 'Unable to submit reservation. Please try again.' }
  }

  revalidatePath('/amenities')

  return {
    success: true,
    message: 'Amenity reservation submitted for review.',
  }
}

export async function fetchTenantReservations() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to view reservations.')
  }

  const { data, error } = await supabase
    .from('amenity_reservations')
    .select('id,amenity_id,start_time,end_time,status,amenities(name)')
    .eq('lease_id', user.id)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Failed to load tenant reservations', error)
    throw new Error('Unable to load your reservations right now.')
  }

  return data as (AmenityReservation & { amenities: Pick<Amenity, 'name'> | null })[]
}
