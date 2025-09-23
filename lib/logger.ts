import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

import pino from 'pino'

import { CORRELATION_ID_HEADER } from './constants/logging'

type RequestContext = {
  correlationId: string
}

type HeaderRecord = Record<string, string | string[] | undefined>
type HeaderGetter = {
  get(name: string): string | null | undefined
}

type HeaderSource = HeaderGetter | HeaderRecord | null | undefined

const requestContext = new AsyncLocalStorage<RequestContext>()

function resolveHeaderValue(
  value: string | string[] | null | undefined
): string | undefined {
  if (!value) {
    return undefined
  }

  return Array.isArray(value) ? value[0] : value
}

function isHeaderGetter(value: unknown): value is HeaderGetter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof (value as HeaderGetter).get === 'function'
  )
}

function getFromRecord(record: HeaderRecord | null | undefined): string | undefined {
  if (!record) {
    return undefined
  }

  const direct =
    record[CORRELATION_ID_HEADER] ??
    record[CORRELATION_ID_HEADER.toLowerCase()] ??
    record[CORRELATION_ID_HEADER.toUpperCase()]

  return resolveHeaderValue(direct)
}

function readCorrelationIdFromHeaders(source: HeaderSource): string | undefined {
  if (!source) {
    return undefined
  }

  if (isHeaderGetter(source)) {
    return resolveHeaderValue(source.get(CORRELATION_ID_HEADER))
  }

  return getFromRecord(source)
}

function createCorrelationId(): string {
  return randomUUID()
}

const baseLogger = pino({
  base: undefined,
  level: process.env.LOG_LEVEL ?? 'info',
  messageKey: 'message',
  mixin() {
    const correlationId = getCorrelationId()
    return correlationId ? { correlationId } : {}
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
})

export const logger = baseLogger

export function getLogger(bindings?: pino.Bindings) {
  return bindings ? baseLogger.child(bindings) : baseLogger
}

export function getCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId
}

export function initializeRequestContext(
  options: { headers?: HeaderSource; correlationId?: string } = {}
): string {
  const correlationId =
    options.correlationId ??
    readCorrelationIdFromHeaders(options.headers ?? null) ??
    createCorrelationId()

  requestContext.enterWith({ correlationId })

  return correlationId
}

export function withRequestContext<T>(
  fn: () => T,
  options: { headers?: HeaderSource; correlationId?: string } = {}
): T {
  const correlationId =
    options.correlationId ??
    readCorrelationIdFromHeaders(options.headers ?? null) ??
    createCorrelationId()

  return requestContext.run({ correlationId }, fn)
}

export function getCorrelationIdFromHeaders(
  headers: HeaderSource
): string | undefined {
  return readCorrelationIdFromHeaders(headers)
}

export type { HeaderSource }
