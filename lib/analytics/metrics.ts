import { ANALYTICS_EVENT_TYPES, GLOBAL_SCOPE, type AnalyticsEventType, type AnalyticsRollup, type RollupSummary, type TimeseriesPoint } from './types'

export type AggregationEvent = {
  eventType: AnalyticsEventType
  occurredAt: Date
  actorId?: string | null
  unitId?: string | null
}

const DAY_IN_MS = 86_400_000

type AggregateState = {
  eventCount: number
  actors: Set<string>
  firstEventAt: Date | null
  lastEventAt: Date | null
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function updateAggregate(state: AggregateState, event: AggregationEvent) {
  state.eventCount += 1
  if (event.actorId) {
    state.actors.add(event.actorId)
  }

  if (!state.firstEventAt || event.occurredAt < state.firstEventAt) {
    state.firstEventAt = event.occurredAt
  }

  if (!state.lastEventAt || event.occurredAt > state.lastEventAt) {
    state.lastEventAt = event.occurredAt
  }
}

function buildAggregateState(): AggregateState {
  return {
    eventCount: 0,
    actors: new Set<string>(),
    firstEventAt: null,
    lastEventAt: null,
  }
}

function aggregateKey(scope: string, eventType: AnalyticsEventType) {
  return `${scope}|${eventType}`
}

function parseAggregateKey(key: string): { scope: string; eventType: AnalyticsEventType } | null {
  const separatorIndex = key.indexOf('|')
  if (separatorIndex === -1) {
    return null
  }

  const scope = key.slice(0, separatorIndex)
  const eventType = key.slice(separatorIndex + 1) as AnalyticsEventType
  return { scope, eventType }
}

export function computeDailyRollups(events: AggregationEvent[], targetDate: Date): AnalyticsRollup[] {
  const start = startOfUtcDay(targetDate)
  const end = new Date(start.getTime() + DAY_IN_MS)
  const rollupDate = toDateKey(start)

  const scopedAggregates = new Map<string, AggregateState>()

  for (const event of events) {
    if (event.occurredAt < start || event.occurredAt >= end) {
      continue
    }

    const globalKey = aggregateKey(GLOBAL_SCOPE, event.eventType)
    const globalState = scopedAggregates.get(globalKey) ?? buildAggregateState()
    updateAggregate(globalState, event)
    scopedAggregates.set(globalKey, globalState)

    if (event.unitId) {
      const unitScope = `unit:${event.unitId}`
      const unitKey = aggregateKey(unitScope, event.eventType)
      const unitState = scopedAggregates.get(unitKey) ?? buildAggregateState()
      updateAggregate(unitState, event)
      scopedAggregates.set(unitKey, unitState)
    }
  }

  const rollups: AnalyticsRollup[] = []

  for (const [key, state] of scopedAggregates.entries()) {
    const parsed = parseAggregateKey(key)
    if (!parsed) {
      continue
    }

    const { scope, eventType } = parsed
    const unitId = scope.startsWith('unit:') ? scope.slice(5) : null

    rollups.push({
      rollupDate,
      eventType,
      scope,
      eventCount: state.eventCount,
      uniqueActorCount: state.actors.size,
      metadata: {
        unit_id: unitId,
        first_event_at: state.firstEventAt ? state.firstEventAt.toISOString() : null,
        last_event_at: state.lastEventAt ? state.lastEventAt.toISOString() : null,
      },
    })
  }

  return rollups.sort((a, b) => {
    if (a.scope === b.scope) {
      return a.eventType.localeCompare(b.eventType)
    }

    if (a.scope === GLOBAL_SCOPE) {
      return -1
    }

    if (b.scope === GLOBAL_SCOPE) {
      return 1
    }

    return a.scope.localeCompare(b.scope)
  })
}

export function enumerateDateRange(from: Date, to: Date): string[] {
  const start = startOfUtcDay(from)
  const end = startOfUtcDay(to)
  const dates: string[] = []

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_IN_MS) {
    dates.push(toDateKey(new Date(current)))
  }

  return dates
}

export function rollupsToTimeseries(
  rollups: AnalyticsRollup[],
  eventTypes: AnalyticsEventType[],
  options: { from: Date; to: Date; scope?: string }
): TimeseriesPoint[] {
  const scope = options.scope ?? GLOBAL_SCOPE
  const range = enumerateDateRange(options.from, options.to)
  const byDate = new Map<string, Record<AnalyticsEventType, number>>()

  for (const rollup of rollups) {
    if (rollup.scope !== scope) {
      continue
    }

    const existing = byDate.get(rollup.rollupDate) ?? ({} as Record<AnalyticsEventType, number>)
    existing[rollup.eventType] = (existing[rollup.eventType] ?? 0) + rollup.eventCount
    byDate.set(rollup.rollupDate, existing)
  }

  return range.map((date) => {
    const countsForDate = byDate.get(date) ?? {}
    const counts = {} as Record<AnalyticsEventType, number>

    for (const eventType of eventTypes) {
      counts[eventType] = countsForDate[eventType] ?? 0
    }

    return { date, counts }
  })
}

export function summarizeRollups(
  rollups: AnalyticsRollup[],
  scope: string = GLOBAL_SCOPE
): Record<AnalyticsEventType, RollupSummary> {
  const summary = Object.fromEntries(
    ANALYTICS_EVENT_TYPES.map((eventType) => [
      eventType,
      {
        total: 0,
        peakUniqueActors: 0,
        firstEventAt: null,
        lastEventAt: null,
      } satisfies RollupSummary,
    ])
  ) as Record<AnalyticsEventType, RollupSummary>

  for (const rollup of rollups) {
    if (rollup.scope !== scope) {
      continue
    }

    const entry = summary[rollup.eventType]
    entry.total += rollup.eventCount
    entry.peakUniqueActors = Math.max(entry.peakUniqueActors, rollup.uniqueActorCount)

    const firstEventAt = typeof rollup.metadata.first_event_at === 'string' ? rollup.metadata.first_event_at : null
    const lastEventAt = typeof rollup.metadata.last_event_at === 'string' ? rollup.metadata.last_event_at : null

    if (firstEventAt && (!entry.firstEventAt || firstEventAt < entry.firstEventAt)) {
      entry.firstEventAt = firstEventAt
    }

    if (lastEventAt && (!entry.lastEventAt || lastEventAt > entry.lastEventAt)) {
      entry.lastEventAt = lastEventAt
    }
  }

  return summary
}

export type ScopeBreakdown = {
  scope: string
  total: number
  breakdown: Record<AnalyticsEventType, number>
}

export function aggregateRollupsByScope(
  rollups: AnalyticsRollup[],
  options: { excludeScopes?: string[] } = {}
): ScopeBreakdown[] {
  const excluded = new Set(options.excludeScopes ?? [])
  const aggregates = new Map<string, ScopeBreakdown>()

  for (const rollup of rollups) {
    if (excluded.has(rollup.scope)) {
      continue
    }

    const existing = aggregates.get(rollup.scope) ?? {
      scope: rollup.scope,
      total: 0,
      breakdown: Object.fromEntries(
        ANALYTICS_EVENT_TYPES.map((eventType) => [eventType, 0])
      ) as Record<AnalyticsEventType, number>,
    }

    existing.total += rollup.eventCount
    existing.breakdown[rollup.eventType] += rollup.eventCount
    aggregates.set(rollup.scope, existing)
  }

  return Array.from(aggregates.values()).sort((a, b) => b.total - a.total)
}
