import { TOP_MEMBER_SEARCH_QUERIES, type MemberSearchExpectation } from '@/config/search/top-member-queries'

export const MEMBER_SEARCH_LATENCY_BUDGET_MS = 150
const MAX_OBSERVATIONS_PER_QUERY = 50

export type MemberSearchHitSummary = {
  id: string | null
  role?: string | null
  unit_id?: string | null
}

export type MemberSearchTelemetry = {
  normalizedQuery: string
  p95: number
  missingEntities: string[]
  expectationTracked: boolean
}

const expectationMap = new Map<string, MemberSearchExpectation>()

for (const expectation of TOP_MEMBER_SEARCH_QUERIES) {
  const normalized = normalizeMemberSearchQuery(expectation.query)
  if (expectationMap.has(normalized)) {
    console.warn('Duplicate member search expectation detected', {
      query: expectation.query,
    })
    continue
  }
  expectationMap.set(normalized, expectation)
}

const latencyObservations = new Map<string, number[]>()

function computePercentile(samples: number[], percentile: number): number {
  if (!samples.length) {
    return 0
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.ceil(percentile * sorted.length) - 1

  return sorted[Math.max(0, index)]
}

function trackLatency(query: string, durationMs: number): number {
  const existing = latencyObservations.get(query) ?? []
  existing.push(durationMs)
  if (existing.length > MAX_OBSERVATIONS_PER_QUERY) {
    existing.shift()
  }
  latencyObservations.set(query, existing)

  return computePercentile(existing, 0.95)
}

export function normalizeMemberSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function recordMemberSearchTelemetry({
  query,
  durationMs,
  hits,
}: {
  query: string
  durationMs: number
  hits: MemberSearchHitSummary[]
}): MemberSearchTelemetry {
  const normalizedQuery = normalizeMemberSearchQuery(query)
  const sanitizedHits = hits ?? []

  const p95 = trackLatency(normalizedQuery, durationMs)
  const expectation = expectationMap.get(normalizedQuery)
  const missingEntities = expectation
    ? expectation.expectedEntityIds.filter(
        (expectedId) => !sanitizedHits.some((hit) => hit?.id === expectedId)
      )
    : []

  if (expectation && missingEntities.length > 0) {
    console.warn('Member search expectation mismatch', {
      query,
      expected: expectation.expectedEntityIds,
      missing: missingEntities,
      observed: sanitizedHits.map((hit) => hit?.id).filter((id): id is string => Boolean(id)),
    })
  }

  if (expectation) {
    if (durationMs > MEMBER_SEARCH_LATENCY_BUDGET_MS) {
      console.warn('Member search latency budget exceeded', {
        query,
        durationMs,
        budgetMs: MEMBER_SEARCH_LATENCY_BUDGET_MS,
      })
    }

    if (p95 > MEMBER_SEARCH_LATENCY_BUDGET_MS) {
      console.warn('Member search p95 above budget', {
        query,
        p95,
        budgetMs: MEMBER_SEARCH_LATENCY_BUDGET_MS,
      })
    }
  } else if (normalizedQuery) {
    const slowThreshold = MEMBER_SEARCH_LATENCY_BUDGET_MS * 2
    if (p95 > slowThreshold) {
      console.warn('Untracked member search query is slow', {
        query,
        p95,
        slowThreshold,
      })
    }
  }

  return {
    normalizedQuery,
    p95,
    missingEntities,
    expectationTracked: Boolean(expectation),
  }
}

export function getMemberSearchMonitorSnapshot() {
  return Object.fromEntries(
    [...latencyObservations.entries()].map(([query, durations]) => [
      query,
      {
        count: durations.length,
        p95: computePercentile(durations, 0.95),
      },
    ])
  )
}

export function resetMemberSearchMonitor() {
  latencyObservations.clear()
}
