import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildBlackoutConflictMessage,
  doTimeslotsOverlap,
  ensureAmenityIsBookable,
  findLocalConflict,
  type AmenityBlackout,
} from '@/lib/amenities/blackouts'
import { BookingBlackoutError } from '@/lib/errors'

const baseBlackout: AmenityBlackout = {
  id: 'blackout-1',
  amenity_id: 'kitchen',
  starts_at: '2024-06-01T10:00:00.000Z',
  ends_at: '2024-06-01T12:00:00.000Z',
  reason: 'Deep cleaning',
  created_at: '2024-05-31T20:00:00.000Z',
  created_by: 'admin-user',
  timeslot: null,
}

describe('amenity blackout helpers', () => {
  it('detects overlapping ranges', () => {
    const overlap = doTimeslotsOverlap(
      new Date('2024-06-01T10:30:00Z'),
      new Date('2024-06-01T11:30:00Z'),
      new Date(baseBlackout.starts_at),
      new Date(baseBlackout.ends_at)
    )

    const noOverlap = doTimeslotsOverlap(
      new Date('2024-06-01T12:00:00Z'),
      new Date('2024-06-01T13:00:00Z'),
      new Date(baseBlackout.starts_at),
      new Date(baseBlackout.ends_at)
    )

    expect(overlap).toBe(true)
    expect(noOverlap).toBe(false)
  })

  it('finds conflicting blackout from a list', () => {
    const conflict = findLocalConflict(
      [baseBlackout],
      new Date('2024-06-01T11:00:00Z'),
      new Date('2024-06-01T11:30:00Z')
    )

    expect(conflict).toMatchObject({ id: 'blackout-1' })
  })

  it('formats descriptive blackout conflict messages', () => {
    const message = buildBlackoutConflictMessage(baseBlackout)

    expect(message).toContain('Amenity is unavailable')
    expect(message).toContain('Deep cleaning')
  })

  it('throws a BookingBlackoutError when a conflict exists', async () => {
    const query: any = {
      select: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
      gt: vi.fn(),
      neq: vi.fn(),
    }

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.neq.mockReturnValue(query)
    query.gt.mockReturnValue(
      Promise.resolve({
        data: [baseBlackout],
        error: null,
      })
    )

    const client: any = {
      from: vi.fn(() => query),
    }

    await expect(
      ensureAmenityIsBookable(client, {
        amenityId: 'kitchen',
        startsAt: new Date('2024-06-01T11:00:00Z'),
        endsAt: new Date('2024-06-01T11:30:00Z'),
      })
    ).rejects.toBeInstanceOf(BookingBlackoutError)
  })

  it('passes when no conflicting blackout exists', async () => {
    const query: any = {
      select: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
      gt: vi.fn(),
      neq: vi.fn(),
    }

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.neq.mockReturnValue(query)
    query.gt.mockReturnValue(
      Promise.resolve({
        data: [],
        error: null,
      })
    )

    const client: any = {
      from: vi.fn(() => query),
    }

    await expect(
      ensureAmenityIsBookable(client, {
        amenityId: 'kitchen',
        startsAt: new Date('2024-06-02T11:00:00Z'),
        endsAt: new Date('2024-06-02T11:30:00Z'),
      })
    ).resolves.toBeUndefined()
  })
})

describe('booking route blackout enforcement', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  function createMockSupabase(data: AmenityBlackout[]) {
    const query: any = {
      select: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
      gt: vi.fn(),
      neq: vi.fn(),
    }

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.neq.mockReturnValue(query)
    query.gt.mockReturnValue(Promise.resolve({ data, error: null }))

    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(() => query),
    }
  }

  it('returns a conflict response when a blackout overlaps', async () => {
    vi.doMock('@/utils/supabase/server', () => ({
      createClient: () => createMockSupabase([baseBlackout]),
    }))

    const { POST } = await import('@/app/api/bookings/route')

    const response = await POST(
      new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          amenityId: 'kitchen',
          startsAt: '2024-06-01T10:30:00Z',
          endsAt: '2024-06-01T11:30:00Z',
        }),
      })
    )

    expect(response.status).toBe(409)
    const payload = await response.json()
    expect(payload.error).toBe('Amenity blackout conflict.')
    expect(payload.message).toContain('Deep cleaning')
  })

  it('allows the booking when no blackouts overlap', async () => {
    vi.doMock('@/utils/supabase/server', () => ({
      createClient: () => createMockSupabase([]),
    }))

    const { POST } = await import('@/app/api/bookings/route')

    const response = await POST(
      new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          amenityId: 'kitchen',
          startsAt: '2024-06-02T10:30:00Z',
          endsAt: '2024-06-02T11:30:00Z',
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.status).toBe('ok')
  })
})
