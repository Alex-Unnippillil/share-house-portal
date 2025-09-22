import { describe, expect, it } from 'vitest'

import {
  calculateBookingMetrics,
  sortAmenitySlots,
} from '@/app/bookings/loaders'
import type { AmenitySlot } from '@/types/supabase'

describe('booking loader helpers', () => {
  it('sortAmenitySlots orders slots chronologically', () => {
    const unsorted: AmenitySlot[] = [
      { start: '2024-06-02T10:00:00Z', end: '2024-06-02T11:00:00Z', isPeak: false },
      { start: '2024-06-02T08:00:00Z', end: '2024-06-02T09:00:00Z', isPeak: false },
      { start: '2024-06-02T09:00:00Z', end: '2024-06-02T10:00:00Z', isPeak: true },
    ]

    const sorted = sortAmenitySlots(unsorted)
    expect(sorted.map((slot) => slot.start)).toEqual([
      '2024-06-02T08:00:00Z',
      '2024-06-02T09:00:00Z',
      '2024-06-02T10:00:00Z',
    ])
  })

  it('calculateBookingMetrics derives availability summaries', () => {
    const entries: Array<[string, AmenitySlot[]]> = [
      [
        'kitchen',
        sortAmenitySlots([
          { start: '2024-06-02T08:00:00Z', end: '2024-06-02T09:00:00Z', isPeak: false },
          { start: '2024-06-02T18:00:00Z', end: '2024-06-02T19:00:00Z', isPeak: true },
        ]),
      ],
      [
        'lounge',
        sortAmenitySlots([
          { start: '2024-06-02T20:00:00Z', end: '2024-06-02T21:00:00Z', isPeak: true },
        ]),
      ],
      ['studio', []],
    ]

    const metrics = calculateBookingMetrics(entries)
    expect(metrics.totalAvailableSlots).toBe(3)
    expect(metrics.firstAvailableSlot).toBe('2024-06-02T08:00:00Z')
    expect(metrics.amenitiesWithAvailability).toBe(2)
    expect(metrics.peakSlotShare).toBeCloseTo(66.7)
  })
})
