import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

import {
  approveVisitorRequest,
  cancelVisitorRequest,
  initialVisitorActionState,
  submitVisitorRequest,
} from '@/app/dashboard/visitors/actions'

type LogRecord = {
  id: string
  status: string
  unit_id: string
  host_profile_id: string
  arrival_date: string
  departure_date: string
  guest_full_name: string
  guest_email: string | null
  reason: string | null
  expected_guests: number
  roommate_recipient_ids: string[]
  stay_summary: string | null
  created_at: string
  updated_at: string
}

type AuditRecord = {
  id: string
  log_id: string
  event_type: string
  event_status: string | null
  message: string | null
  created_at: string
}

const store = {
  contexts: new Map<string, any>(),
  logs: [] as LogRecord[],
  audits: [] as AuditRecord[],
  notifications: [] as { logId: string; context: string }[],
}

const supabaseMock = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/utils/supaone', () => ({
  createSupbaseServerClient: vi.fn(async () => supabaseMock),
}))

vi.mock('@/lib/visitors/repository', () => ({
  getHostContext: vi.fn(async (_client, profileId: string) => {
    return store.contexts.get(profileId) ?? null
  }),
  countMonthlyVisitorRequests: vi.fn(async (_client, { hostId }: { hostId: string }) => {
    return store.logs.filter((log) => log.host_profile_id === hostId && log.status !== 'denied').length
  }),
  countActiveVisitorRequests: vi.fn(async (_client, { hostId }: { hostId: string }) => {
    return store.logs.filter((log) => log.host_profile_id === hostId && log.status === 'pending').length
  }),
  insertVisitorLog: vi.fn(async (_client, payload: Partial<LogRecord>) => {
    const log: LogRecord = {
      id: `log-${store.logs.length + 1}`,
      status: 'pending',
      unit_id: payload.unit_id!,
      host_profile_id: payload.host_profile_id!,
      arrival_date: payload.arrival_date!,
      departure_date: payload.departure_date!,
      guest_full_name: payload.guest_full_name!,
      guest_email: (payload.guest_email as string | null) ?? null,
      reason: (payload.reason as string | null) ?? null,
      expected_guests: payload.expected_guests ?? 1,
      roommate_recipient_ids: payload.roommate_recipient_ids ?? [],
      stay_summary: (payload.stay_summary as string | null) ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.logs.push(log)
    return { id: log.id }
  }),
  updateVisitorLog: vi.fn(async (_client, logId: string, updates: Partial<LogRecord>) => {
    const log = store.logs.find((item) => item.id === logId)
    if (!log) {
      return null
    }
    Object.assign(log, updates, { updated_at: new Date().toISOString() })
    return log
  }),
  logVisitorAuditEvent: vi.fn(async (_client, payload: { log_id: string; event_type: string; event_status?: string | null; message?: string | null }) => {
    store.audits.push({
      id: `audit-${store.audits.length + 1}`,
      log_id: payload.log_id,
      event_type: payload.event_type,
      event_status: payload.event_status ?? null,
      message: payload.message ?? null,
      created_at: new Date().toISOString(),
    })
  }),
  getVisitorLogWithRelations: vi.fn(async (_client, logId: string) => {
    const log = store.logs.find((item) => item.id === logId)
    if (!log) {
      return null
    }
    return {
      ...log,
      unit: store.contexts.get(log.host_profile_id)?.unit ?? null,
      rule: store.contexts.get(log.host_profile_id)?.rule ?? null,
      host: store.contexts.get(log.host_profile_id)?.profile ?? null,
    }
  }),
}))

vi.mock('@/lib/visitor-notifications', () => ({
  sendVisitorNotification: vi.fn(async ({ logId, context }: { logId: string; context: string }) => {
    store.notifications.push({ logId, context })
  }),
  formatStayWindow: (arrival: string, departure: string) => `${arrival} -> ${departure}`,
}))

beforeEach(() => {
  store.logs = []
  store.audits = []
  store.notifications = []
  store.contexts.clear()
  revalidatePathMock.mockClear()

  store.contexts.set('host-1', {
    profile: { id: 'host-1', full_name: 'Host User', email: 'host@example.com', role: 'tenant' },
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
      max_consecutive_nights: 4,
      max_visitors_per_month: 6,
      max_active_requests: 3,
      max_guests_per_stay: 4,
      approval_required: true,
      lead_time_hours: 0,
      notes: null,
      effective_start_date: '2025-01-01',
      effective_end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'manager-1',
      updated_by: 'manager-1',
    },
    roommates: [
      { id: 'host-1', full_name: 'Host User', email: 'host@example.com', role: 'tenant' },
      { id: 'roommate-1', full_name: 'Roommate User', email: 'roommate@example.com', role: 'tenant' },
    ],
    manager: { id: 'manager-1', full_name: 'Manager', email: 'manager@example.com', role: 'property_manager' },
  })

  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      const builder: any = {}
      builder.select = vi.fn().mockReturnValue(builder)
      builder.eq = vi.fn().mockReturnValue(builder)
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'manager-1', full_name: 'Manager', email: 'manager@example.com', role: 'property_manager' },
      })
      return builder
    }
    throw new Error(`Unexpected table ${table}`)
  })
})

describe('Overnight visitor flow', () => {
  it('supports submitting, approving, and cancelling a visit', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null })

    const submission = new FormData()
    submission.append('guestFullName', 'Guest Example')
    submission.append('guestEmail', 'guest@example.com')
    submission.append('arrivalDate', '2025-03-10')
    submission.append('departureDate', '2025-03-12')
    submission.append('reason', 'Family visit')
    submission.append('expectedGuests', '2')

    const submitResult = await submitVisitorRequest(initialVisitorActionState, submission)

    expect(submitResult.status).toBe('success')
    expect(store.logs).toHaveLength(1)
    expect(store.logs[0].status).toBe('pending')

    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'manager-1' } }, error: null })

    const approveForm = new FormData()
    approveForm.append('logId', store.logs[0].id)
    approveForm.append('note', 'Enjoy your time together')

    const approveResult = await approveVisitorRequest(initialVisitorActionState, approveForm)

    expect(approveResult.status).toBe('success')
    expect(store.logs[0].status).toBe('approved')

    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null })

    const cancelForm = new FormData()
    cancelForm.append('logId', store.logs[0].id)
    cancelForm.append('reason', 'Plans changed')

    const cancelResult = await cancelVisitorRequest(initialVisitorActionState, cancelForm)

    expect(cancelResult.status).toBe('success')
    expect(store.logs[0].status).toBe('cancelled')
    expect(store.audits.filter((audit) => audit.log_id === store.logs[0].id)).toHaveLength(3)
    expect(store.notifications.filter((note) => note.logId === store.logs[0].id)).toHaveLength(3)
  })
})
