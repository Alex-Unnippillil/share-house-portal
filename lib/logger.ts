import pino, { type Logger, type LoggerOptions } from "pino"

interface RequestContext {
  requestId?: string | null
  userId?: string | null
}

const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "share-house-portal",
  },
}

const baseLogger = pino(defaultOptions)

export type StructuredLogger = Logger

export function getRequestLogger(context: RequestContext = {}) {
  const { requestId, userId } = context

  return baseLogger.child({
    requestId: requestId ?? "unknown",
    userId: userId ?? "anonymous",
  })
}
