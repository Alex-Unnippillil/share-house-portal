import { format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'
import { ApplicationError, BookingBlackoutError } from '@/lib/errors'

export type AmenityBlackout = Database['public']['Tables']['amenity_blackouts']['Row']

export type AmenityBlackoutInput = {
  amenityId: string
  startsAt: Date
  endsAt: Date
  excludeId?: string
}

export function doTimeslotsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA < endB && endA > startB
}

export function findLocalConflict(
  blackouts: AmenityBlackout[],
  startsAt: Date,
  endsAt: Date
): AmenityBlackout | null {
  return (
    blackouts.find((blackout) =>
      doTimeslotsOverlap(
        startsAt,
        endsAt,
        new Date(blackout.starts_at),
        new Date(blackout.ends_at)
      )
    ) ?? null
  )
}

export function describeBlackout(blackout: AmenityBlackout) {
  const formattedStart = format(new Date(blackout.starts_at), 'MMM d, yyyy h:mm a')
  const formattedEnd = format(new Date(blackout.ends_at), 'MMM d, yyyy h:mm a')

  return `${formattedStart} – ${formattedEnd} · ${blackout.reason}`
}

export async function fetchConflictingBlackout(
  client: SupabaseClient<Database>,
  { amenityId, startsAt, endsAt, excludeId }: AmenityBlackoutInput
): Promise<AmenityBlackout | null> {
  const query = client
    .from('amenity_blackouts')
    .select('id, amenity_id, starts_at, ends_at, reason')
    .eq('amenity_id', amenityId)
    .lt('starts_at', endsAt.toISOString())
    .gt('ends_at', startsAt.toISOString())

  if (excludeId) {
    query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) {
    throw new ApplicationError('Failed to load amenity blackout windows.', {
      error,
    })
  }

  if (!data) {
    return null
  }

  return findLocalConflict(data, startsAt, endsAt)
}

export async function ensureAmenityIsBookable(
  client: SupabaseClient<Database>,
  input: AmenityBlackoutInput
) {
  const conflict = await fetchConflictingBlackout(client, input)

  if (conflict) {
    throw new BookingBlackoutError(
      buildBlackoutConflictMessage(conflict),
      conflict
    )
  }
}

export function buildBlackoutConflictMessage(blackout: AmenityBlackout) {
  return `Amenity is unavailable from ${format(
    new Date(blackout.starts_at),
    'MMM d, yyyy h:mm a'
  )} to ${format(new Date(blackout.ends_at), 'MMM d, yyyy h:mm a')} because: ${
    blackout.reason
  }`
}
