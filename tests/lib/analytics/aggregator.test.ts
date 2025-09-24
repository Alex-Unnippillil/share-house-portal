import { describe, expect, it } from 'vitest'

import {
  aggregateRollupsByScope,
  computeDailyRollups,
  rollupsToTimeseries,
  summarizeRollups,
  type AggregationEvent,
} from '@/lib/analytics/metrics'
import { GLOBAL_SCOPE } from '@/lib/analytics/types'

const TARGET_DAY = new Date('2025-02-20T00:00:00Z')

const SAMPLE_EVENTS: AggregationEvent[] = [
  {
    eventType: 'rent_payment_submitted',
    occurredAt: new Date('2025-02-20T03:00:00Z'),
    actorId: 'tenant-1',
    unitId: 'unit-a',
  },
  {
    eventType: 'rent_payment_submitted',
    occurredAt: new Date('2025-02-20T06:30:00Z'),
    actorId: 'tenant-2',
    unitId: 'unit-a',
  },
  {
    eventType: 'rent_payment_submitted',
    occurredAt: new Date('2025-02-20T18:45:00Z'),
    actorId: 'tenant-1',
    unitId: 'unit-a',
  },
  {
    eventType: 'maintenance_request_filed',
    occurredAt: new Date('2025-02-20T10:15:00Z'),
    actorId: 'tenant-3',
    unitId: 'unit-b',
  },
  {
    eventType: 'maintenance_request_filed',
    occurredAt: new Date('2025-02-20T11:05:00Z'),
    actorId: 'tenant-3',
    unitId: 'unit-b',
  },
  {
    eventType: 'amenity_booking_created',
    occurredAt: new Date('2025-02-20T12:00:00Z'),
    actorId: 'tenant-2',
  },
  {
    eventType: 'rent_payment_submitted',
    occurredAt: new Date('2025-02-21T01:00:00Z'),
    actorId: 'tenant-4',
    unitId: 'unit-a',
  },
]

describe('computeDailyRollups', () => {
  const rollups = computeDailyRollups(SAMPLE_EVENTS, TARGET_DAY)

  it('aggregates global counts and unique actors', () => {
    const rentGlobal = rollups.find(
      (rollup) => rollup.scope === GLOBAL_SCOPE && rollup.eventType === 'rent_payment_submitted'
    )
    expect(rentGlobal).toBeTruthy()
    expect(rentGlobal?.eventCount).toBe(3)
    expect(rentGlobal?.uniqueActorCount).toBe(2)
    expect(rentGlobal?.metadata.first_event_at).toBe('2025-02-20T03:00:00.000Z')
    expect(rentGlobal?.metadata.last_event_at).toBe('2025-02-20T18:45:00.000Z')
  })

  it('tracks per-unit activity with correct metadata', () => {
    const unitRollup = rollups.find(
      (rollup) => rollup.scope === 'unit:unit-a' && rollup.eventType === 'rent_payment_submitted'
    )
    expect(unitRollup).toBeTruthy()
    expect(unitRollup?.eventCount).toBe(3)
    expect(unitRollup?.uniqueActorCount).toBe(2)
    expect(unitRollup?.metadata.unit_id).toBe('unit-a')
  })

  it('ignores events that fall outside of the target window', () => {
    const rentCounts = rollups.filter(
      (rollup) => rollup.scope === GLOBAL_SCOPE && rollup.eventType === 'rent_payment_submitted'
    )
    const totalEvents = rentCounts.reduce((sum, rollup) => sum + rollup.eventCount, 0)
    expect(totalEvents).toBe(3 /* only same-day events are counted */)
  })
})

describe('rollupsToTimeseries and summarisation helpers', () => {
  const baseRollups = computeDailyRollups(SAMPLE_EVENTS, TARGET_DAY)
  const previousDayEvents: AggregationEvent[] = [
    {
      eventType: 'rent_payment_submitted',
      occurredAt: new Date('2025-02-19T09:00:00Z'),
      actorId: 'tenant-9',
      unitId: 'unit-a',
    },
  ]
  const nextWindowEvents: AggregationEvent[] = [
    {
      eventType: 'maintenance_request_filed',
      occurredAt: new Date('2025-02-22T04:30:00Z'),
      actorId: 'tenant-8',
      unitId: 'unit-c',
    },
  ]
  const fullRollups = [
    ...computeDailyRollups(previousDayEvents, new Date('2025-02-19T00:00:00Z')),
    ...baseRollups,
    ...computeDailyRollups(nextWindowEvents, new Date('2025-02-22T00:00:00Z')),
  ]

  it('builds a dense global timeseries for the requested range', () => {
    const series = rollupsToTimeseries(fullRollups, ['rent_payment_submitted', 'maintenance_request_filed'], {
      from: new Date('2025-02-19T00:00:00Z'),
      to: new Date('2025-02-22T00:00:00Z'),
      scope: GLOBAL_SCOPE,
    })

    expect(series).toHaveLength(4)
    expect(series[0]).toEqual({
      date: '2025-02-19',
      counts: {
        rent_payment_submitted: 1,
        maintenance_request_filed: 0,
      },
    })
    expect(series[1]).toEqual({
      date: '2025-02-20',
      counts: {
        rent_payment_submitted: 3,
        maintenance_request_filed: 2,
      },
    })
    expect(series[2]).toEqual({
      date: '2025-02-21',
      counts: {
        rent_payment_submitted: 0,
        maintenance_request_filed: 0,
      },
    })
    expect(series[3]).toEqual({
      date: '2025-02-22',
      counts: {
        rent_payment_submitted: 0,
        maintenance_request_filed: 1,
      },
    })
  })

  it('summarises totals and peak participation for the global scope', () => {
    const summary = summarizeRollups(baseRollups)
    expect(summary.rent_payment_submitted.total).toBe(3)
    expect(summary.rent_payment_submitted.peakUniqueActors).toBe(2)
    expect(summary.amenity_booking_created.total).toBe(1)
    expect(summary.amenity_booking_created.peakUniqueActors).toBe(1)
  })

  it('ranks non-global scopes by total activity', () => {
    const scopeBreakdown = aggregateRollupsByScope(baseRollups, { excludeScopes: [GLOBAL_SCOPE] })
    expect(scopeBreakdown[0]?.scope).toBe('unit:unit-a')
    expect(scopeBreakdown[0]?.breakdown.rent_payment_submitted).toBe(3)
    expect(scopeBreakdown.at(-1)?.scope).toBe('unit:unit-b')
  })
})
