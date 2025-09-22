import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

import {
  approveVisitorRequest,
  cancelVisitorRequest,
  denyVisitorRequest,
  initialVisitorActionState,
  submitVisitorRequest,
} from '@/app/dashboard/visitors/actions'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

const repositoryMocks = vi.hoisted(() => ({
  getHostContext: vi.fn(),
  countMonthlyVisitorRequests: vi.fn(),
  countActiveVisitorRequests: vi.fn(),
  insertVisitorLog: vi.fn(),
  logVisitorAuditEvent: vi.fn(),
  updateVisitorLog: vi.fn(),
  getVisitorLogWithRelations: vi.fn(),
}))

const notificationMocks = vi.hoisted(() => ({
  sendVisitorNotification: vi.fn(),
}))

let profileResult: { data: { id: string; full_name: string | null; email: string | null; role: string | null } | null }

vi.mock('@/utils/supaone', () => ({
  createSupbaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/lib/visitors/repository', () => ({
  ...repositoryMocks,
}))

vi.mock('@/lib/visitor-notifications', () => ({
  ...notificationMocks,
  formatStayWindow: (arrival: string, departure: string) => `${arrival} -> ${departure}`,
}))

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()
  revalidatePathMock.mockClear()
  profileResult = {
    data: {
      id: 'manager-1',
      full_name: 'Manager One',
      email: 'manager@example.com',
      role: 'property_manager',
    },
  }
  supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null })
  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      const builder: any = {}
      builder.select = vi.fn().mockReturnValue(builder)
      builder.eq = vi.fn().mockReturnValue(builder)
      builder.maybeSingle = vi.fn().mockImplementation(async () => profileResult)
      return builder
    }
    throw new Error(`Unexpected table ${table}`)
  })
  repositoryMocks.countMonthlyVisitorRequests.mockResolvedValue(0)
  repositoryMocks.countActiveVisitorRequests.mockResolvedValue(0)
  repositoryMocks.insertVisitorLog.mockResolvedValue({ id: 'log-1' })
  repositoryMocks.logVisitorAuditEvent.mockResolvedValue(undefined)
  repositoryMocks.updateVisitorLog.mockResolvedValue(undefined)
  notificationMocks.sendVisitorNotification.mockResolvedValue(undefined)
  repositoryMocks.getVisitorLogWithRelations.mockResolvedValue(null)
})

const hostContext = {
  profile: { id: 'host-1', full_name: 'Host One', email: 'host@example.com', role: 'tenant' },
  unit: {
    id: 'unit-1',
    building_name: 'Building A',
    unit_number: '1A',
    manager_profile_id: 'manager-1',
    timezone: 'UTC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  rule: {
    id: 'rule-1',
    unit_id: 'unit-1',
    max_consecutive_nights: 3,
    max_visitors_per_month: 5,
    max_active_requests: 2,
    max_guests_per_stay: 4,
    approval_required: true,
    lead_time_hours: 12,
    notes: null,
    effective_start_date: '2025-01-01',
    effective_end_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'manager-1',
    updated_by: 'manager-1',
  },
  roommates: [
    { id: 'host-1', full_name: 'Host One', email: 'host@example.com', role: 'tenant' },
    { id: 'roommate-1', full_name: 'Roommate', email: 'roommate@example.com', role: 'tenant' },
  ],
  manager: { id: 'manager-1', full_name: 'Manager One', email: 'manager@example.com', role: 'property_manager' },
}

describe('submitVisitorRequest', () => {
  it('rejects requests that exceed the consecutive night limit', async () => {
    repositoryMocks.getHostContext.mockResolvedValue(hostContext)

    const form = new FormData()
    form.append('guestFullName', 'Guest Name')
    form.append('guestEmail', 'guest@example.com')
    form.append('arrivalDate', '2025-01-01')
    form.append('departureDate', '2025-01-06')
    form.append('reason', 'Vacation visit')
    form.append('expectedGuests', '2')

    const result = await submitVisitorRequest(initialVisitorActionState, form)

    expect(result.status).toBe('error')
    expect(result.fieldErrors?.departureDate).toContain('exceeding')
    expect(repositoryMocks.insertVisitorLog).not.toHaveBeenCalled()
  })

  it('creates visitor log and sends notifications when valid', async () => {
    repositoryMocks.getHostContext.mockResolvedValue(hostContext)

    const form = new FormData()
    form.append('guestFullName', 'Guest Name')
    form.append('guestEmail', 'guest@example.com')
    form.append('arrivalDate', '2025-01-10')
    form.append('departureDate', '2025-01-12')
    form.append('reason', 'Vacation visit')
    form.append('expectedGuests', '2')

    const result = await submitVisitorRequest(initialVisitorActionState, form)

    expect(result.status).toBe('success')
    expect(repositoryMocks.insertVisitorLog).toHaveBeenCalledOnce()
    const insertPayload = repositoryMocks.insertVisitorLog.mock.calls[0][1]
    expect(insertPayload.unit_id).toBe('unit-1')
    expect(insertPayload.roommate_recipient_ids).toContain('roommate-1')
    expect(notificationMocks.sendVisitorNotification).toHaveBeenCalledOnce()
    expect(repositoryMocks.logVisitorAuditEvent).toHaveBeenCalled()
  })
})

describe('cancelVisitorRequest', () => {
  it('prevents cancellation when user is not the host', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null })
    repositoryMocks.getVisitorLogWithRelations.mockResolvedValue({
      id: 'log-1',
      host_profile_id: 'host-1',
      status: 'pending',
      arrival_date: '2025-01-01',
      departure_date: '2025-01-02',
      guest_full_name: 'Guest',
      unit: hostContext.unit,
      rule: hostContext.rule,
      roommate_recipient_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reason: 'Visit',
      expected_guests: 1,
      host: { full_name: 'Host One', email: 'host@example.com' },
    })

    const form = new FormData()
    form.append('logId', 'log-1')
    form.append('reason', 'Change of plans')

    const result = await cancelVisitorRequest(initialVisitorActionState, form)

    expect(result.status).toBe('error')
    expect(repositoryMocks.updateVisitorLog).not.toHaveBeenCalled()
  })
})

describe('approveVisitorRequest', () => {
  beforeEach(() => {
    profileResult = {
      data: {
        id: 'manager-1',
        full_name: 'Manager One',
        email: 'manager@example.com',
        role: 'property_manager',
      },
    }
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'manager-1' } }, error: null })
    repositoryMocks.getVisitorLogWithRelations.mockResolvedValue({
      id: 'log-1',
      host_profile_id: 'host-1',
      status: 'pending',
      arrival_date: '2025-02-01',
      departure_date: '2025-02-03',
      guest_full_name: 'Guest',
      reason: 'Visit',
      expected_guests: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      roommate_recipient_ids: ['roommate-1'],
      unit: hostContext.unit,
      rule: hostContext.rule,
      host: { full_name: 'Host One', email: 'host@example.com' },
    })
    repositoryMocks.getHostContext.mockResolvedValue(hostContext)
  })

  it('approves a visitor request and notifies the household', async () => {
    const form = new FormData()
    form.append('logId', 'log-1')
    form.append('note', 'Have a great stay')

    const result = await approveVisitorRequest(initialVisitorActionState, form)

    expect(result.status).toBe('success')
    expect(repositoryMocks.updateVisitorLog).toHaveBeenCalled()
    expect(repositoryMocks.logVisitorAuditEvent).toHaveBeenCalled()
    expect(notificationMocks.sendVisitorNotification).toHaveBeenCalled()
  })
})

describe('denyVisitorRequest', () => {
  beforeEach(() => {
    profileResult = {
      data: {
        id: 'manager-1',
        full_name: 'Manager One',
        email: 'manager@example.com',
        role: 'property_manager',
      },
    }
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'manager-1' } }, error: null })
    repositoryMocks.getVisitorLogWithRelations.mockResolvedValue({
      id: 'log-1',
      host_profile_id: 'host-1',
      status: 'pending',
      arrival_date: '2025-02-01',
      departure_date: '2025-02-03',
      guest_full_name: 'Guest',
      reason: 'Visit',
      expected_guests: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      roommate_recipient_ids: ['roommate-1'],
      unit: hostContext.unit,
      rule: hostContext.rule,
      host: { full_name: 'Host One', email: 'host@example.com' },
    })
    repositoryMocks.getHostContext.mockResolvedValue(hostContext)
  })

  it('denies a visitor request and records the note', async () => {
    const form = new FormData()
    form.append('logId', 'log-1')
    form.append('note', 'Too many guests this month')

    const result = await denyVisitorRequest(initialVisitorActionState, form)

    expect(result.status).toBe('success')
    expect(repositoryMocks.updateVisitorLog).toHaveBeenCalled()
    expect(repositoryMocks.logVisitorAuditEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event_status: 'denied' }))
    expect(notificationMocks.sendVisitorNotification).toHaveBeenCalled()
  })
})
