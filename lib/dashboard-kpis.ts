import type { SupabaseClient } from '@supabase/supabase-js'
import { performance as nodePerformance } from 'node:perf_hooks'

import type { Database } from '@/lib/supabase'

const CACHE_KEY = 'dashboard'
const CACHE_SCOPE = 'global'
const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000

const performanceNow = () => {
  if (typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function') {
    return globalThis.performance.now()
  }

  return nodePerformance.now()
}

export type DashboardKpiPayload = {
  totalRentCollectedThisMonth: number
  overdueRentPayments: number
  activeLeases: number
  openMaintenanceRequests: number
  upcomingVisitorsNext7Days: number
  pendingDocumentsAwaitingSignature: number
}

export type DashboardKpiResult = DashboardKpiPayload & {
  computedAt: string
  source: 'cache' | 'recalculated'
  loadTimeMs: number
  cacheHit: boolean
  cacheError?: string | null
}

type SupabaseLike = SupabaseClient<Database>

type LoadOptions = {
  maxAgeMs?: number
  now?: () => number
  perfNow?: () => number
}

function normalisePayload(payload: Record<string, unknown> | null | undefined): DashboardKpiPayload {
  const safeNumber = (value: unknown) => {
    if (value === null || value === undefined) return 0
    const numericValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    return Number.isFinite(numericValue) ? numericValue : 0
  }

  return {
    totalRentCollectedThisMonth: safeNumber(payload?.totalRentCollectedThisMonth),
    overdueRentPayments: Math.trunc(safeNumber(payload?.overdueRentPayments)),
    activeLeases: Math.trunc(safeNumber(payload?.activeLeases)),
    openMaintenanceRequests: Math.trunc(safeNumber(payload?.openMaintenanceRequests)),
    upcomingVisitorsNext7Days: Math.trunc(safeNumber(payload?.upcomingVisitorsNext7Days)),
    pendingDocumentsAwaitingSignature: Math.trunc(safeNumber(payload?.pendingDocumentsAwaitingSignature)),
  }
}

export async function loadDashboardKpis(
  supabase: SupabaseLike,
  options: LoadOptions = {}
): Promise<DashboardKpiResult> {
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  const nowFn = options.now ?? (() => Date.now())
  const perfFn = options.perfNow ?? performanceNow

  const cacheStart = perfFn()
  const { data: cacheRow, error: cacheError } = await supabase
    .from('kpi_cache')
    .select('payload, computed_at, expires_at, error')
    .match({ key: CACHE_KEY, scope: CACHE_SCOPE })
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const cacheDurationMs = perfFn() - cacheStart

  const nowMs = nowFn()
  if (cacheRow?.payload && !cacheError) {
    const expiresAtMs = cacheRow.expires_at ? Date.parse(cacheRow.expires_at) : undefined
    const computedAtMs = cacheRow.computed_at ? Date.parse(cacheRow.computed_at) : undefined
    const fallbackExpiry = typeof computedAtMs === 'number' ? computedAtMs + maxAgeMs : nowMs + maxAgeMs
    const freshnessDeadline = typeof expiresAtMs === 'number' ? Math.min(expiresAtMs, fallbackExpiry) : fallbackExpiry
    const isFresh = freshnessDeadline >= nowMs

    if (isFresh) {
      const payload = normalisePayload(cacheRow.payload as Record<string, unknown>)
      return {
        ...payload,
        computedAt: cacheRow.computed_at ?? new Date(nowMs).toISOString(),
        source: 'cache',
        loadTimeMs: cacheDurationMs,
        cacheHit: true,
        cacheError: cacheRow.error ?? null,
      }
    }
  }

  const fallbackStart = perfFn()
  const { data: recalculated, error: recalculationError } = await supabase.rpc('calculate_dashboard_kpis')
  const fallbackDurationMs = perfFn() - fallbackStart

  if (recalculationError) {
    throw new Error(`Failed to calculate dashboard KPIs: ${recalculationError.message}`)
  }

  const payload = normalisePayload(recalculated as Record<string, unknown> | null | undefined)

  return {
    ...payload,
    computedAt: new Date(nowMs).toISOString(),
    source: 'recalculated',
    loadTimeMs: fallbackDurationMs,
    cacheHit: false,
    cacheError: cacheError?.message ?? cacheRow?.error ?? null,
  }
}
