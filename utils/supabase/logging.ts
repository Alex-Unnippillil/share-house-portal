import { TRACE_HEADER_NAME } from '@/utils/trace/constants'

type Logger = Pick<typeof console, 'info' | 'error'>

export type SupabaseLoggingOptions = {
  traceId?: string
  source?: string
  logger?: Logger
}

export type SupabaseClientLoggingConfig = {
  global: {
    fetch: typeof fetch
    headers?: Record<string, string>
  }
}

function parseRowCountFromContentRange(contentRange: string | null): number | undefined {
  if (!contentRange) {
    return undefined
  }

  const [, totalPart] = contentRange.split('/')
  if (!totalPart || totalPart === '*') {
    return undefined
  }

  const total = Number(totalPart)
  return Number.isFinite(total) ? total : undefined
}

async function safelyExtractJson(response: Response) {
  try {
    return await response.json()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Unable to parse JSON body for logging', error)
    }
    return undefined
  }
}

function deriveRowCount(data: unknown): number | undefined {
  if (!data) {
    return undefined
  }

  if (Array.isArray(data)) {
    return data.length
  }

  if (typeof data === 'object') {
    const casted = data as Record<string, unknown>
    if (Array.isArray(casted.data)) {
      return casted.data.length
    }

    if (typeof casted.count === 'number') {
      return casted.count
    }
  }

  return undefined
}

function buildLogPrefix(meta: SupabaseLogMeta) {
  const parts = [
    '[Supabase]',
    meta.source ? `source=${meta.source}` : undefined,
    meta.traceId ? `trace=${meta.traceId}` : undefined,
    `${meta.method} ${meta.path}`,
    `status=${meta.status}`,
    `durationMs=${meta.durationMs}`,
    meta.rows !== undefined ? `rows=${meta.rows}` : undefined,
  ].filter(Boolean)

  return parts.join(' ')
}

type SupabaseLogMeta = {
  traceId?: string
  source?: string
  method: string
  path: string
  status: number
  durationMs: number
  rows?: number
  sql?: string | null
  requestId?: string | null
}

export function createSupabaseFetchWithLogging(
  options: SupabaseLoggingOptions = {},
): typeof fetch {
  const { traceId, source, logger = console } = options

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const effectiveTraceId = traceId ?? request.headers.get(TRACE_HEADER_NAME) ?? undefined
    if (effectiveTraceId && !request.headers.has(TRACE_HEADER_NAME)) {
      request.headers.set(TRACE_HEADER_NAME, effectiveTraceId)
    }

    const requestUrl = new URL(request.url)
    const startedAt = Date.now()

    try {
      const response = await fetch(request)
      const durationMs = Date.now() - startedAt

      const clone = response.clone()
      const [body, contentRange] = await Promise.all([
        safelyExtractJson(clone),
        Promise.resolve(response.headers.get('content-range')),
      ])

      const rowsFromBody = deriveRowCount(body)
      const rows = rowsFromBody ?? parseRowCountFromContentRange(contentRange)

      const meta: SupabaseLogMeta = {
        traceId: effectiveTraceId,
        source,
        method: request.method.toUpperCase(),
        path: `${requestUrl.pathname}${requestUrl.search}`,
        status: response.status,
        durationMs,
        rows,
        sql: response.headers.get('x-supabase-sql'),
        requestId:
          response.headers.get('x-request-id') ??
          response.headers.get('request-id') ??
          response.headers.get('x-correlation-id'),
      }

      logger.info(buildLogPrefix(meta), {
        ...meta,
      })

      return response
    } catch (error) {
      const durationMs = Date.now() - startedAt
      logger.error('[Supabase] Request failed', {
        traceId: effectiveTraceId,
        source,
        method: request.method.toUpperCase(),
        url: request.url,
        durationMs,
        error,
      })
      throw error
    }
  }
}

export function createSupabaseClientLoggingConfig(
  options: SupabaseLoggingOptions = {},
): SupabaseClientLoggingConfig {
  const fetch = createSupabaseFetchWithLogging(options)
  const headers: Record<string, string> | undefined = options.traceId
    ? { [TRACE_HEADER_NAME]: options.traceId }
    : undefined

  return {
    global: headers
      ? {
          fetch,
          headers,
        }
      : { fetch },
  }
}
