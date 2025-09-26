import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"
import pino, { type DestinationStream, type Logger as PinoLogger } from "pino"

type LogContext = {
  requestId: string
  userId?: string
}

type LogConfiguration = {
  destination?: DestinationStream
}

const storage = new AsyncLocalStorage<LogContext>()

function createBaseLogger(destination?: DestinationStream) {
  return pino(
    {
      level:
        process.env.LOG_LEVEL ??
        (process.env.NODE_ENV === "production" ? "info" : "debug"),
      messageKey: "message",
      base: undefined,
      formatters: {
        bindings(bindings) {
          if (!bindings) return {}
          const base: Record<string, unknown> = {}
          if (typeof bindings.pid === "number") {
            base.pid = bindings.pid
          }
          if (typeof bindings.hostname === "string") {
            base.hostname = bindings.hostname
          }
          return base
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination
  )
}

let baseLogger: PinoLogger = createBaseLogger()

export function configureLogger(config: LogConfiguration = {}) {
  baseLogger = createBaseLogger(config.destination)
}

export function withLogContext<ReturnType>(
  context: LogContext,
  callback: () => ReturnType
): ReturnType {
  return storage.run({ ...context }, callback)
}

export function withRequestLogging<RequestType extends { headers: Headers }, Args extends unknown[], ReturnType>(
  handler: (request: RequestType, ...args: Args) => ReturnType
) {
  return (request: RequestType, ...args: Args) => {
    const existingContext = storage.getStore()
    const requestId =
      request.headers.get("x-request-id") ??
      request.headers.get("x-correlation-id") ??
      existingContext?.requestId ??
      randomUUID()

    if (existingContext?.requestId === requestId) {
      return handler(request, ...args)
    }

    return withLogContext({ requestId }, () => handler(request, ...args))
  }
}

export function setLogContext(context: Partial<LogContext>) {
  const currentContext = storage.getStore()
  if (!currentContext) return
  Object.assign(currentContext, context)
}

export function getLogger() {
  const context = storage.getStore()
  return context ? baseLogger.child(context) : baseLogger
}

export function getCurrentLogContext() {
  return storage.getStore()
}
