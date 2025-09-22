import { addDays } from 'date-fns'
import { cookies } from 'next/headers'

import type { AmenitySlot } from '@/types/supabase'
import { createClient } from '@/utils/supa-server-actions'

export type BookingHistoryItem = {
  id: string
  amenityName: string
  amenitySlug: string | null
  startTime: string
  endTime: string
  status: string
}

export type BookingMetrics = {
  totalAvailableSlots: number
  firstAvailableSlot: string | null
  peakSlotShare: number
  amenitiesWithAvailability: number
}

export type BookingOverview = {
  availability: Record<string, AmenitySlot[]>
  metrics: BookingMetrics
  history: BookingHistoryItem[]
  range: { start: string; end: string }
}

const DEFAULT_WINDOW_DAYS = 7

export function sortAmenitySlots(slots: AmenitySlot[]): AmenitySlot[] {
  return slots
    .slice()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

export function calculateBookingMetrics(
  availabilityEntries: Array<readonly [string, AmenitySlot[]]>,
): BookingMetrics {
  const allSlots = availabilityEntries.flatMap(([, slots]) => slots)
  const sortedSlots = sortAmenitySlots(allSlots)
  const peakSlots = sortedSlots.filter((slot) => slot.isPeak).length
  const totalSlots = sortedSlots.length

  return {
    totalAvailableSlots: totalSlots,
    firstAvailableSlot: sortedSlots[0]?.start ?? null,
    peakSlotShare: totalSlots === 0 ? 0 : Math.round((peakSlots / totalSlots) * 1000) / 10,
    amenitiesWithAvailability: availabilityEntries.filter(([, slots]) => slots.length > 0).length,
  }
}

export async function loadBookingOverview(
  amenitySlugs: string[],
  options?: { householdId?: string | null; rangeStart?: Date; rangeEnd?: Date },
): Promise<BookingOverview> {
  if (amenitySlugs.length === 0) {
    return {
      availability: {},
      metrics: {
        totalAvailableSlots: 0,
        firstAvailableSlot: null,
        peakSlotShare: 0,
        amenitiesWithAvailability: 0,
      },
      history: [],
      range: { start: new Date().toISOString(), end: new Date().toISOString() },
    }
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const rangeStart = options?.rangeStart ?? new Date()
  const rangeEnd = options?.rangeEnd ?? addDays(rangeStart, DEFAULT_WINDOW_DAYS)
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const availabilityEntries = await Promise.all(
    amenitySlugs.map(async (slug) => {
      const { data, error } = await supabase.rpc('get_available_amenity_slots', {
        p_amenity_slug: slug,
        p_household_id: options?.householdId ?? null,
        p_range_start: rangeStartIso,
        p_range_end: rangeEndIso,
      })

      if (error) {
        throw new Error(`Failed to load availability for ${slug}: ${error.message}`)
      }

      const slots: AmenitySlot[] = (data ?? []).map((slot) => ({
        start: slot.slot_start,
        end: slot.slot_end,
        isPeak: slot.is_peak,
      }))

      return [slug, sortAmenitySlots(slots)] as const
    }),
  )

  const availability = Object.fromEntries(availabilityEntries)
  const metrics = calculateBookingMetrics(availabilityEntries)

  const { data: bookingRows, error: bookingError } = await supabase
    .from('amenity_bookings')
    .select('id,start_time,end_time,status,amenities(name,slug)')
    .gte('start_time', rangeStartIso)
    .lte('start_time', rangeEndIso)
    .order('start_time', { ascending: false })
    .limit(6)

  if (bookingError) {
    throw new Error(`Failed to load amenity booking history: ${bookingError.message}`)
  }

  const history: BookingHistoryItem[] = (bookingRows ?? []).map((row) => ({
    id: row.id,
    amenityName: (row.amenities as { name?: string } | null)?.name ?? 'Amenity',
    amenitySlug: (row.amenities as { slug?: string } | null)?.slug ?? null,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }))

  return {
    availability,
    metrics,
    history,
    range: { start: rangeStartIso, end: rangeEndIso },
  }
}
