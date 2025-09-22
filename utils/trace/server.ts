import { headers } from 'next/headers'

import { TRACE_HEADER_NAME } from './constants'

export function readTraceIdFromHeaders(
  source?: Headers | HeadersInit | null,
): string | undefined {
  if (!source) {
    return undefined
  }

  if (source instanceof Headers) {
    return source.get(TRACE_HEADER_NAME) ?? undefined
  }

  const headersInstance = new Headers(source)
  return headersInstance.get(TRACE_HEADER_NAME) ?? undefined
}

export function getCurrentTraceId(): string | undefined {
  try {
    return headers().get(TRACE_HEADER_NAME) ?? undefined
  } catch {
    return undefined
  }
}

export function ensureTraceId(existing?: string | null): string {
  return existing && existing.length > 0 ? existing : crypto.randomUUID()
}
