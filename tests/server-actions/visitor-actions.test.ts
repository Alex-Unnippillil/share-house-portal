import { describe, expect, test, vi } from 'vitest'

import type {
  ProfileSummary,
  VisitorAuditRow,
  VisitorLogRow,
  VisitorLogWithRelations,
  VisitorRuleRow,
} from '@/types/visitors'

import {
  handleCancelVisitorRequest,
  handleCreateVisitorRequest,
  handleResolveVisitorRequest,
} from '@/app/dashboard/visitors/actions/shared'

const hostProfile: ProfileSummary = {
  id: 'host-1',
  full_name: 'Host One',
  email: 'host@example.com',
  role: 'tenant',
  building_id: 'building-1',
  unit_id: 'unit-1',
}

const managerProfile: ProfileSummary = {
  id: 'manager-1',
  full_name: 'Manager',
  email: 'manager@example.com',
  role: 'property_manager',
  building_id: 'building-1',
  unit_id: null,
}

function createRule(overrides: Partial<VisitorRuleRow> = {}): VisitorRuleRow {
  const now = new Date().toISOString()
  return {
    id: 1,
    title: 'Unit policy',
    description: null,
    building_id: 'building-1',
    unit_id: 'unit-1',
    max_consecutive_nights: 3,
    max_visits_per_month: null,
    require_manager_approval: true,
    advance_notice_hours: null,
    created_at: now,
    updated_at: now,
    created_by: hostProfile.id,
    active: true,
    metadata: {},
    ...overrides,
  }
}

function createLog(overrides: Partial<VisitorLogRow> = {}): VisitorLogRow {
  const now = new Date().toISOString()
  return {
    id: 10,
    created_at: now,
    updated_at: now,
    host_profile_id: hostProfile.id,
    building_id: hostProfile.building_id!,
    unit_id: hostProfile.unit_id!,
    visitor_name: 'Guest',
    visitor_email: 'guest@example.com',
    arrival_date: '2024-01-01',
    departure_date: '2024-01-03',
    total_nights: 3,
    reason: 'Vacation',
    status: 'pending',
    rule_id: 1,
    approval_notes: null,
    approved_by: null,
    approved_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    metadata: {},
    ...overrides,
  }
}

function createAuditRow(overrides: Partial<VisitorAuditRow> = {}): VisitorAuditRow {
  const now = new Date().toISOString()
  return {
    id: 1,
    log_id: 10,
    actor_profile_id: hostProfile.id,
    action: 'created',
    notes: null,
    metadata: {},
    created_at: now,
    ...overrides,
  }
}

function createLogWithRelations(
  overrides: Partial<VisitorLogWithRelations> = {},
): VisitorLogWithRelations {
  const { rule, host, ...logOverrides } = overrides
  return {
    ...createLog(logOverrides as Partial<VisitorLogRow>),
    rule: rule ?? createRule(),
    host: host ?? hostProfile,
  }
}

describe('visitor server actions', () => {
  test('rejects requests that exceed consecutive night policy', async () => {
    const rule = createRule()
    const insertLogSpy = vi.fn()
    const createAuditSpy = vi.fn()

    const result = await handleCreateVisitorRequest(
      {
        profile: hostProfile,
        fetchRule: async () => rule,
        insertLog: async payload => {
          insertLogSpy(payload)
          return createLog(payload as Partial<VisitorLogRow>)
        },
        createAudit: async entry => {
          createAuditSpy(entry)
          return createAuditRow()
        },
        listRoommates: async () => [],
        listManagers: async () => [],
      },
      {
        visitorName: 'Guest',
        visitorEmail: 'guest@example.com',
        arrivalDate: '2024-01-01',
        departureDate: '2024-01-10',
        reason: 'Vacation',
        ruleId: rule.id,
      },
      vi.fn(),
    )

    expect(result.status).toBe('error')
    expect(result.message).toContain('exceeds')
    expect(insertLogSpy).not.toHaveBeenCalled()
    expect(createAuditSpy).not.toHaveBeenCalled()
  })

  test('creates a visitor log and sends notifications', async () => {
    const rule = createRule({ max_consecutive_nights: 5, require_manager_approval: true })
    const insertLogSpy = vi.fn(async (payload: Partial<VisitorLogRow>) => createLog(payload))
    const createAuditSpy = vi.fn()
    const notify = vi.fn(async () => {})

    const result = await handleCreateVisitorRequest(
      {
        profile: hostProfile,
        fetchRule: async () => rule,
        insertLog: async payload => insertLogSpy(payload as Partial<VisitorLogRow>),
        createAudit: async entry => {
          createAuditSpy(entry)
          return createAuditRow()
        },
        listRoommates: async () => [
          {
            id: 'roommate-2',
            full_name: 'Roommate',
            email: 'roomie@example.com',
            role: 'tenant',
            building_id: hostProfile.building_id,
            unit_id: hostProfile.unit_id,
          },
        ],
        listManagers: async () => [
          {
            id: 'manager-1',
            full_name: 'Manager',
            email: 'manager@example.com',
            role: 'property_manager',
            building_id: hostProfile.building_id,
            unit_id: null,
          },
        ],
      },
      {
        visitorName: 'Guest',
        visitorEmail: 'guest@example.com',
        arrivalDate: '2024-01-01',
        departureDate: '2024-01-03',
        reason: 'Vacation',
        ruleId: rule.id,
      },
      notify,
    )

    expect(result.status).toBe('success')
    expect(result.logId).toBeDefined()
    expect(insertLogSpy).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(createAuditSpy).toHaveBeenCalled()
  })

  test('cancels visitor requests and alerts stakeholders', async () => {
    const notify = vi.fn(async () => {})
    const updateLog = vi.fn(async () =>
      createLog({ status: 'cancelled', cancelled_at: new Date().toISOString() }),
    )
    const createAuditSpy = vi.fn()

    const result = await handleCancelVisitorRequest(
      {
        actor: hostProfile,
        getLog: async () =>
          createLogWithRelations({
            status: 'approved',
          }),
        updateLog: async (_, changes) => updateLog(createLog(changes as Partial<VisitorLogRow>)),
        createAudit: async entry => {
          createAuditSpy(entry)
          return createAuditRow()
        },
        listRoommates: async () => [],
        listManagers: async () => [],
      },
      {
        logId: 10,
        reason: 'Plans changed',
      },
      notify,
    )

    expect(result.status).toBe('success')
    expect(updateLog).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'request_cancelled' }),
    )
    expect(createAuditSpy).toHaveBeenCalled()
  })

  test('approves a visitor request', async () => {
    const notify = vi.fn(async () => {})
    const updateLog = vi.fn(async () =>
      createLog({ status: 'approved', approved_by: managerProfile.id }),
    )
    const createAuditSpy = vi.fn()

    const result = await handleResolveVisitorRequest(
      {
        actor: managerProfile,
        getLog: async () =>
          createLogWithRelations({
            status: 'pending',
          }),
        updateLog: async (_, changes) => updateLog(createLog(changes as Partial<VisitorLogRow>)),
        createAudit: async entry => {
          createAuditSpy(entry)
          return createAuditRow()
        },
        listRoommates: async () => [],
        listManagers: async () => [],
      },
      {
        logId: 10,
        decision: 'approved',
        notes: 'Enjoy your stay',
      },
      notify,
    )

    expect(result.status).toBe('success')
    expect(updateLog).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'status_changed', decision: 'approved' }),
    )
    expect(createAuditSpy).toHaveBeenCalled()
  })
})
