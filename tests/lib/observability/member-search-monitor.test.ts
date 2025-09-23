import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TOP_MEMBER_SEARCH_QUERIES } from '@/config/search/top-member-queries'
import {
  MEMBER_SEARCH_LATENCY_BUDGET_MS,
  getMemberSearchMonitorSnapshot,
  recordMemberSearchTelemetry,
  resetMemberSearchMonitor,
} from '@/lib/observability/member-search-monitor'

function createHit(id: string) {
  return { id, role: null, unit_id: null }
}

describe('member search monitor', () => {
  beforeEach(() => {
    resetMemberSearchMonitor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetMemberSearchMonitor()
  })

  it('tracks expectations for the top 100 queries', () => {
    expect(TOP_MEMBER_SEARCH_QUERIES).toHaveLength(100)
  })

  it('warns when expected entities are missing', () => {
    const expectation = TOP_MEMBER_SEARCH_QUERIES[0]
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const telemetry = recordMemberSearchTelemetry({
      query: expectation.query,
      durationMs: MEMBER_SEARCH_LATENCY_BUDGET_MS / 2,
      hits: [createHit('unexpected-profile')],
    })

    expect(telemetry.expectationTracked).toBe(true)
    expect(telemetry.missingEntities).toEqual(expectation.expectedEntityIds)
    expect(warnSpy).toHaveBeenCalledWith(
      'Member search expectation mismatch',
      expect.objectContaining({ query: expectation.query })
    )
  })

  it('records latency metrics and flags slow searches', () => {
    const expectation = TOP_MEMBER_SEARCH_QUERIES[1]
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const expectedHits = expectation.expectedEntityIds.map((id) => createHit(id))

    recordMemberSearchTelemetry({
      query: expectation.query,
      durationMs: MEMBER_SEARCH_LATENCY_BUDGET_MS / 2,
      hits: expectedHits,
    })
    recordMemberSearchTelemetry({
      query: expectation.query,
      durationMs: MEMBER_SEARCH_LATENCY_BUDGET_MS * 1.5,
      hits: expectedHits,
    })

    const snapshot = getMemberSearchMonitorSnapshot()
    const normalized = expectation.query.trim().toLowerCase()
    expect(snapshot[normalized]).toBeDefined()
    expect(snapshot[normalized].count).toBe(2)
    expect(snapshot[normalized].p95).toBeGreaterThan(MEMBER_SEARCH_LATENCY_BUDGET_MS * 0.75)

    expect(warnSpy).toHaveBeenCalledWith(
      'Member search latency budget exceeded',
      expect.objectContaining({
        query: expectation.query,
        budgetMs: MEMBER_SEARCH_LATENCY_BUDGET_MS,
      })
    )
    expect(warnSpy).toHaveBeenCalledWith(
      'Member search p95 above budget',
      expect.objectContaining({ query: expectation.query })
    )
  })
})
