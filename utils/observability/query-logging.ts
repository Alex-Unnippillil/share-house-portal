import { performance } from 'node:perf_hooks'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

import { getQueryContext, type QueryContext } from './query-context'

const LOG_TABLE = 'observability.query_costs'
const WARNING_THRESHOLD_MS = 500
const CRITICAL_THRESHOLD_MS = 1000

export const QUERY_COST_ALERT_THRESHOLDS = {
  warning: WARNING_THRESHOLD_MS,
  critical: CRITICAL_THRESHOLD_MS,
} as const

type AlertLevel = 'info' | 'warning' | 'critical'

export type QueryLoggingContext = Partial<QueryContext> & {
  operation?: string
}

interface QueryCostLogEntry {
  traceId?: string
  route?: string
  actor?: string
  operation?: string
  method: string
  path: string
  statusCode: number
  totalExecTimeMs: number
  rowCount: number
  alertLevel?: AlertLevel
  entity?: string
  metadata?: Record<string, unknown>
  recordedAt?: string
}

let logClient: SupabaseClient<Database> | null = null

function getLogClient(): SupabaseClient<Database> | null {
  if (logClient) {
    return logClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  logClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return logClient
}

function determineAlertLevel(durationMs: number): AlertLevel {
  if (durationMs >= CRITICAL_THRESHOLD_MS) {
    return 'critical'
  }

  if (durationMs >= WARNING_THRESHOLD_MS) {
    return 'warning'
  }

  return 'info'
}

function resolveContext(
  explicit?: QueryLoggingContext
): QueryLoggingContext {
  const inherited = getQueryContext()

  return {
    ...(inherited ?? {}),
    ...(explicit ?? {}),
    metadata: mergeMetadata(inherited?.metadata, explicit?.metadata),
  }
}

function mergeMetadata(
  base?: Record<string, unknown>,
  extra?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!base && !extra) {
    return undefined
  }

  return {
    ...(base ?? {}),
    ...(extra ?? {}),
  }
}

function extractEntityFromPath(path: string): string | undefined {
  const match = path.match(/\/rest\/v1\/([^?]+)/)
  if (!match) {
    return undefined
  }

  return decodeURIComponent(match[1])
}

async function estimateRowCount(response: Response): Promise<number> {
  try {
    const rangeHeader = response.headers.get('content-range')
    if (rangeHeader) {
      const [, total] = rangeHeader.split('/')
      const parsedTotal = Number.parseInt(total ?? '', 10)
      if (!Number.isNaN(parsedTotal)) {
        return parsedTotal
      }
    }

    const clone = response.clone()
    const contentType = clone.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return 0
    }

    const text = await clone.text()
    if (!text) {
      return 0
    }

    const data = JSON.parse(text)

    if (Array.isArray(data)) {
      return data.length
    }

    if (data === null) {
      return 0
    }

    if (typeof data === 'object') {
      if (Array.isArray((data as any).data)) {
        return (data as any).data.length
      }

      if (typeof (data as any).count === 'number') {
        return (data as any).count
      }
    }

    return 1
  } catch (error) {
    return 0
  }
}

function getRelativePath(url: string): string {
  try {
    const { pathname, search } = new URL(url)
    return `${pathname}${search}`
  } catch (error) {
    console.error('[query-costs] Failed to parse URL for logging', error)
    return url
  }
}

function shouldSkipLogging(path: string): boolean {
  return path.includes('/rest/v1/observability.query_costs')
}

function parseError(error: unknown): string | undefined {
  if (!error) {
    return undefined
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return JSON.stringify(error)
}

function logQueryCost(entry: QueryCostLogEntry) {
  const client = getLogClient()
  if (!client) {
    return
  }

  const payload = {
    trace_id: entry.traceId ?? null,
    route: entry.route ?? null,
    actor: entry.actor ?? null,
    operation: entry.operation ?? null,
    method: entry.method,
    path: entry.path,
    status_code: entry.statusCode,
    row_count: entry.rowCount,
    total_exec_time_ms: entry.totalExecTimeMs,
    alert_level: entry.alertLevel ?? null,
    entity: entry.entity ?? null,
    recorded_at: entry.recordedAt ?? new Date().toISOString(),
    metadata: entry.metadata ?? null,
  }

  client
    .from(LOG_TABLE as any)
    .insert(payload)
    .then(({ error }) => {
      if (error) {
        console.error('[query-costs] Failed to persist query log entry', error)
      }
    })
    .catch((error) => {
      console.error('[query-costs] Failed to persist query log entry', error)
    })
}

export function createInstrumentedFetch(
  explicitContext?: QueryLoggingContext
): typeof fetch {
  const baseFetch = globalThis.fetch.bind(globalThis)

  return async function instrumentedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    const request =
      typeof input === 'string' || input instanceof URL
        ? undefined
        : (input as Request)

    const method = (
      init?.method ?? request?.method ?? 'GET'
    ).toUpperCase()

    const urlString =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : request?.url ?? ''

    if (!urlString.includes('/rest/v1/')) {
      return baseFetch(input as any, init)
    }

    const start = performance.now()
    const path = getRelativePath(urlString)

    try {
      const response = await baseFetch(input as any, init)
      const duration = performance.now() - start

      if (!shouldSkipLogging(path)) {
        const context = resolveContext(explicitContext)
        const rowCount = await estimateRowCount(response)
        const metadata = mergeMetadata(
          context.metadata,
          explicitContext?.operation
            ? { operation: explicitContext.operation }
            : undefined
        )

        logQueryCost({
          traceId: context.traceId,
          route: context.route,
          actor: context.actor,
          operation: explicitContext?.operation,
          method,
          path,
          statusCode: response.status,
          rowCount,
          totalExecTimeMs: duration,
          alertLevel: determineAlertLevel(duration),
          entity: extractEntityFromPath(path),
          metadata,
        })
      }

      return response
    } catch (error) {
      const duration = performance.now() - start

      if (!shouldSkipLogging(path)) {
        const context = resolveContext(explicitContext)
        const parsedError = parseError(error)
        const metadata = mergeMetadata(
          context.metadata,
          mergeMetadata(
            explicitContext?.operation
              ? { operation: explicitContext.operation }
              : undefined,
            parsedError ? { error: parsedError } : undefined
          )
        )

        logQueryCost({
          traceId: context.traceId,
          route: context.route,
          actor: context.actor,
          operation: explicitContext?.operation,
          method,
          path,
          statusCode: 0,
          rowCount: 0,
          totalExecTimeMs: duration,
          alertLevel: determineAlertLevel(duration),
          entity: extractEntityFromPath(path),
          metadata,
        })
      }

      throw error
    }
  }
}
