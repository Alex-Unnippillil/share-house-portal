export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogSurface = "route_handler" | "server_action" | "webhook_processor" | "job"

export interface LogContext {
  component?: string
  requestId?: string
  actorId?: string
  tenantId?: string
  unitId?: string
  eventName?: string
  [key: string]: unknown
}

function getTimestamp() {
  return new Date().toISOString()
}

function emit(level: LogLevel, surface: LogSurface, message: string, context: LogContext = {}) {
  const payload = {
    timestamp: getTimestamp(),
    level,
    surface,
    message,
    ...context,
  }

  if (level === "error") {
    console.error(JSON.stringify(payload))
    return
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload))
    return
  }

  if (level === "debug") {
    console.debug(JSON.stringify(payload))
    return
  }

  console.info(JSON.stringify(payload))
}

export function createStructuredLogger(surface: LogSurface, baseContext: LogContext) {
  return {
    debug(message: string, context: LogContext = {}) {
      emit("debug", surface, message, { ...baseContext, ...context })
    },
    info(message: string, context: LogContext = {}) {
      emit("info", surface, message, { ...baseContext, ...context })
    },
    warn(message: string, context: LogContext = {}) {
      emit("warn", surface, message, { ...baseContext, ...context })
    },
    error(message: string, context: LogContext = {}) {
      emit("error", surface, message, { ...baseContext, ...context })
    },
  }
}
