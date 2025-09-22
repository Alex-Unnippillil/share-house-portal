import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { approveVisitorRequest, revokeVisitorRequest } from '@/lib/visitor-requests'
import type { Database } from '@/lib/supabase'

type VisitorRequestRow = Database['public']['Tables']['visitor_requests']['Row']

type SupabaseLike = SupabaseClient<Database>

type SupabaseStub = {
  supabase: SupabaseLike
  spies: {
    from: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    selectEq: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateEq: ReturnType<typeof vi.fn>
  }
}

const baseVisitorRequest: VisitorRequestRow = {
  calcom_booking_id: null,
  calcom_event_type_id: 42,
  created_at: '2025-04-10T00:00:00.000Z',
  ends_at: '2025-04-11T10:00:00.000Z',
  guest_email: 'guest@example.com',
  guest_name: 'Jordan Guest',
  host_email: 'host@example.com',
  id: 'visitor-request-1',
  notes: 'Guest room stay',
  starts_at: '2025-04-11T08:00:00.000Z',
  status: 'pending',
  updated_at: null,
}

const createSupabaseStub = (request: VisitorRequestRow): SupabaseStub => {
  const single = vi.fn().mockResolvedValue({ data: request, error: null })
  const selectEq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq: selectEq }))
  const updateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const update = vi.fn(() => ({ eq: updateEq }))
  const from = vi.fn(() => ({ select, update }))

  return {
    supabase: { from } as unknown as SupabaseLike,
    spies: { from, select, selectEq, single, update, updateEq },
  }
}

describe('visitor request scheduling', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('CALCOM_API_KEY', 'test-api-key')
    vi.stubEnv('CALCOM_BASE_URL', 'https://cal.example.com')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('creates a Cal.com booking when approving a pending visitor request', async () => {
    const { supabase, spies } = createSupabaseStub(structuredClone(baseVisitorRequest))
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ booking: { id: 'booking_123', link: 'https://cal.com/bookings/booking_123' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const timestamp = new Date('2025-04-01T12:00:00.000Z')

    const result = await approveVisitorRequest(supabase, baseVisitorRequest.id, {
      fetchImpl: fetchMock,
      now: () => timestamp,
    })

    expect(result.bookingId).toBe('booking_123')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cal.example.com/bookings',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(requestInit.body as string)
    expect(body.eventTypeId).toBe(baseVisitorRequest.calcom_event_type_id)
    expect(body.start).toBe(baseVisitorRequest.starts_at)
    expect(body.end).toBe(baseVisitorRequest.ends_at)
    expect(body.metadata).toEqual({ visitorRequestId: baseVisitorRequest.id })

    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({
        calcom_booking_id: 'booking_123',
        status: 'approved',
        updated_at: timestamp.toISOString(),
      }),
    )
    expect(spies.updateEq).toHaveBeenCalledWith('id', baseVisitorRequest.id)
  })

  it('cancels the Cal.com booking and clears it from Supabase on revocation', async () => {
    const request = { ...structuredClone(baseVisitorRequest), status: 'approved' as const, calcom_booking_id: 'booking_123' }
    const { supabase, spies } = createSupabaseStub(request)
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }))
    const timestamp = new Date('2025-04-02T09:30:00.000Z')

    const result = await revokeVisitorRequest(supabase, request.id, {
      fetchImpl: fetchMock,
      now: () => timestamp,
    })

    expect(result.cancelledBookingId).toBe('booking_123')
    expect(fetchMock).toHaveBeenCalledWith('https://cal.example.com/bookings/booking_123', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-api-key' },
    })

    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({
        calcom_booking_id: null,
        status: 'revoked',
        updated_at: timestamp.toISOString(),
      }),
    )
  })

  it('skips cancelling bookings when none exist and still updates status', async () => {
    const request = structuredClone(baseVisitorRequest)
    const { supabase, spies } = createSupabaseStub(request)
    const fetchMock = vi.fn()

    const result = await revokeVisitorRequest(supabase, request.id, {
      fetchImpl: fetchMock,
      now: () => new Date('2025-04-03T10:00:00.000Z'),
    })

    expect(result.cancelledBookingId).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'revoked', calcom_booking_id: null }),
    )
  })

  it('throws an error if the visitor request is missing an event type id', async () => {
    const request = { ...structuredClone(baseVisitorRequest), calcom_event_type_id: 0 }
    const { supabase } = createSupabaseStub(request)

    await expect(
      approveVisitorRequest(supabase, request.id, {
        fetchImpl: vi.fn(),
      }),
    ).rejects.toThrow(/event type id/i)
  })
})
