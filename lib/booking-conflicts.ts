import type { SupabaseClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';

import type { Database } from './supabase';

type BookingRow = Database['public']['Tables']['bookings']['Row'];

type BookingConflictParams = {
  amenityId: string;
  startTime: string;
  endTime: string;
  excludeBookingId?: string | null;
};

type BookingConflictMetrics = {
  durationMs: number;
  targetMs: number;
  withinTarget: boolean;
};

type BookingConflictOptions = {
  limit?: number;
  signal?: AbortSignal;
  onObserved?: (metrics: BookingConflictMetrics) => void;
};

export type BookingConflictResult = {
  conflicts: BookingRow[];
  metrics: BookingConflictMetrics;
};

export const BOOKING_CONFLICT_TARGET_MS = 10;

/**
 * Fetch conflicting bookings for a given amenity using range predicates that map
 * directly to the `(amenity_id, start_time, end_time)` composite index.
 */
export async function findBookingConflicts(
  client: SupabaseClient<Database>,
  params: BookingConflictParams,
  options: BookingConflictOptions = {}
): Promise<BookingConflictResult> {
  const { amenityId, startTime, endTime, excludeBookingId } = params;

  if (!amenityId) {
    throw new Error('amenityId is required to check for booking conflicts.');
  }

  if (!startTime || !endTime) {
    throw new Error('Both startTime and endTime are required to check booking conflicts.');
  }

  const measurementStart = performance.now();

  let query = client
    .from('bookings')
    .select('id, amenity_id, start_time, end_time, status', { head: false })
    .eq('amenity_id', amenityId)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .order('start_time', { ascending: true })
    .limit(options.limit ?? 10);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  if (options.signal) {
    query = query.abortSignal(options.signal);
  }

  const { data, error } = await query;

  const durationMs = performance.now() - measurementStart;
  const metrics: BookingConflictMetrics = {
    durationMs,
    targetMs: BOOKING_CONFLICT_TARGET_MS,
    withinTarget: durationMs <= BOOKING_CONFLICT_TARGET_MS,
  };

  if (options.onObserved) {
    options.onObserved(metrics);
  }

  if (!metrics.withinTarget) {
    console.warn(
      `Booking conflict check took ${metrics.durationMs.toFixed(2)}ms (target ${metrics.targetMs}ms).`
    );
  }

  if (error) {
    throw new Error(`Failed to query booking conflicts: ${error.message}`);
  }

  return {
    conflicts: data ?? [],
    metrics,
  };
}
