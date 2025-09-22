import { describe, expect, it, vi } from 'vitest'

import { loadDashboardKpis } from '@/lib/dashboard-kpis'

type QueryResponse = {
  data: {
    payload: Record<string, unknown> | null
    computed_at: string | null
    expires_at: string | null
    error?: string | null
  } | null
  error: { message: string } | null
}

class QueryBuilderStub {
  constructor(private response: QueryResponse, private delayMs: number) {}

  select() {
    return this
  }

  match() {
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  async maybeSingle() {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs))
    }

    return this.response
  }
}

function createSupabaseStub({
  cacheResponse,
  cacheDelay = 0,
  recalculatedResponse,
  recalculatedDelay = 0,
}: {
  cacheResponse: QueryResponse
  cacheDelay?: number
  recalculatedResponse: { data: Record<string, unknown> | null; error: { message: string } | null }
  recalculatedDelay?: number
}) {
  const supabase = {
    from: vi.fn(() => new QueryBuilderStub(cacheResponse, cacheDelay)),
    rpc: vi.fn(async () => {
      if (recalculatedDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, recalculatedDelay))
      }

      return recalculatedResponse
    }),
  }

  return supabase
}

describe('loadDashboardKpis', () => {
  it('returns cached metrics within the 80ms performance budget', async () => {
    const computedAt = new Date().toISOString()
    const cacheResponse: QueryResponse = {
      data: {
        payload: {
          totalRentCollectedThisMonth: 2450.75,
          overdueRentPayments: 1,
          activeLeases: 3,
          openMaintenanceRequests: 2,
          upcomingVisitorsNext7Days: 1,
          pendingDocumentsAwaitingSignature: 2,
        },
        computed_at: computedAt,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    }

    const supabase = createSupabaseStub({
      cacheResponse,
      cacheDelay: 20,
      recalculatedResponse: { data: null, error: null },
    })

    const result = await loadDashboardKpis(supabase as never)

    expect(result.source).toBe('cache')
    expect(result.cacheHit).toBe(true)
    expect(result.loadTimeMs).toBeLessThan(80)
    expect(result.totalRentCollectedThisMonth).toBeCloseTo(2450.75)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('falls back to recalculation when the cache is stale', async () => {
    const oldComputed = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const cacheResponse: QueryResponse = {
      data: {
        payload: {
          totalRentCollectedThisMonth: 1000,
          overdueRentPayments: 5,
          activeLeases: 2,
          openMaintenanceRequests: 4,
          upcomingVisitorsNext7Days: 3,
          pendingDocumentsAwaitingSignature: 1,
        },
        computed_at: oldComputed,
        expires_at: new Date(Date.now() - 30_000).toISOString(),
        error: 'previous failure',
      },
      error: null,
    }

    const supabase = createSupabaseStub({
      cacheResponse,
      recalculatedResponse: {
        data: {
          totalRentCollectedThisMonth: '3120.50',
          overdueRentPayments: 0,
          activeLeases: 4,
          openMaintenanceRequests: 1,
          upcomingVisitorsNext7Days: 2,
          pendingDocumentsAwaitingSignature: 0,
        },
        error: null,
      },
      recalculatedDelay: 10,
    })

    const result = await loadDashboardKpis(supabase as never, {
      maxAgeMs: 5 * 60 * 1000,
    })

    expect(result.source).toBe('recalculated')
    expect(result.cacheHit).toBe(false)
    expect(result.cacheError).toBe('previous failure')
    expect(result.totalRentCollectedThisMonth).toBeCloseTo(3120.5)
    expect(result.openMaintenanceRequests).toBe(1)
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })
})
