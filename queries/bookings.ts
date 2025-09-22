import { PostgrestError } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'
import { TypedSupabaseClient } from '@/utils/typed-supabase-client'

const EXCLUSION_CONFLICT_CODE = '23P01'

export class BookingConflictError extends Error {
  constructor(message = 'Amenity is already booked for the requested timeslot.') {
    super(message)
    this.name = 'BookingConflictError'
  }
}

export type BookingTimeslot = {
  start: Date
  end: Date
}

export type BookingRecord = {
  id: number
  amenityId: string
  createdBy: string
  timeslot: BookingTimeslot
  notes: string | null
  createdAt: Date | null
}

type BookingRow = Database['public']['Tables']['bookings']['Row']

type BookingInsert = Database['public']['Tables']['bookings']['Insert']

export type CreateBookingParams = {
  amenityId: string
  createdBy: string
  timeslot: BookingTimeslot
  notes?: string | null
}

export type BookingWindowFilter = BookingTimeslot

export function serializeTimeslot(timeslot: BookingTimeslot): string {
  const { start, end } = timeslot

  if (!(start instanceof Date) || Number.isNaN(start.valueOf())) {
    throw new TypeError('Timeslot start must be a valid Date instance.')
  }

  if (!(end instanceof Date) || Number.isNaN(end.valueOf())) {
    throw new TypeError('Timeslot end must be a valid Date instance.')
  }

  if (end <= start) {
    throw new RangeError('Timeslot end must be after its start.')
  }

  const lower = formatDateForRange(start)
  const upper = formatDateForRange(end)

  return `[${lower},${upper})`
}

export function parseTimeslot(range: string): BookingTimeslot {
  const trimmed = range.trim()

  if (trimmed.length < 5) {
    throw new Error('Invalid range format received from database.')
  }

  const inner = trimmed.substring(1, trimmed.length - 1)
  const [lowerRaw, upperRaw] = inner.split(',')

  if (!lowerRaw || !upperRaw) {
    throw new Error('Unable to parse timeslot boundaries.')
  }

  const start = parseRangeBoundary(lowerRaw)
  const end = parseRangeBoundary(upperRaw)

  return { start, end }
}

export function isBookingConflictError(error: unknown): error is BookingConflictError {
  return error instanceof BookingConflictError
}

export async function listBookingsByAmenity(
  client: TypedSupabaseClient,
  amenityId: string,
  window?: BookingWindowFilter
): Promise<BookingRecord[]> {
  let query = client
    .from('bookings')
    .select('id, amenity_id, created_by, timeslot, notes, created_at')
    .eq('amenity_id', amenityId)
    .order('timeslot', { ascending: true })

  if (window) {
    query = query.overlaps('timeslot', serializeTimeslot(window))
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map(deserializeBooking)
}

export async function createBooking(
  client: TypedSupabaseClient,
  params: CreateBookingParams
): Promise<BookingRecord> {
  const payload: BookingInsert = {
    amenity_id: params.amenityId,
    created_by: params.createdBy,
    timeslot: serializeTimeslot(params.timeslot),
    notes: params.notes ?? null,
  }

  const { data, error } = await client
    .from('bookings')
    .insert(payload)
    .select('id, amenity_id, created_by, timeslot, notes, created_at')
    .single()

  if (error) {
    handleBookingError(error)
  }

  if (!data) {
    throw new Error('Failed to create booking. No data returned from database.')
  }

  return deserializeBooking(data)
}

function handleBookingError(error: PostgrestError): never {
  if (error.code === EXCLUSION_CONFLICT_CODE) {
    throw new BookingConflictError()
  }

  throw error
}

function deserializeBooking(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    amenityId: row.amenity_id,
    createdBy: row.created_by,
    notes: row.notes ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    timeslot: parseTimeslot(row.timeslot),
  }
}

function parseRangeBoundary(value: string): Date {
  const normalized = value.trim()
  const isoLike = normalized.includes('T') ? normalized : normalized.replace(' ', 'T')
  const withZone = /[zZ]|[+-]\d\d:?\d\d$/.test(isoLike) ? isoLike : `${isoLike}Z`
  const date = new Date(withZone)

  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid timestamp boundary: ${value}`)
  }

  return date
}

function formatDateForRange(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
}
