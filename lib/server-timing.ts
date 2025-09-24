import { AsyncLocalStorage } from "node:async_hooks"

type TimingCategory = "handler" | "db" | "external"

type TimingMetric = {
  category: TimingCategory
  label?: string
  duration: number
}

type TimingStore = {
  metrics: TimingMetric[]
}

const timingStorage = new AsyncLocalStorage<TimingStore>()

function getStore() {
  return timingStorage.getStore()
}

function pushMetric(metric: TimingMetric) {
  const store = getStore()
  if (!store) return
  store.metrics.push(metric)
}

function sanitizeDescription(value: string) {
  return value.replace(/["\\]/g, "'")
}

function formatMetrics(metrics: TimingMetric[]) {
  if (metrics.length === 0) {
    return null
  }

  let handlerIndex = 0
  let dbIndex = 0
  let externalIndex = 0

  const parts = metrics.map((metric) => {
    const duration = Number.isFinite(metric.duration)
      ? Math.max(metric.duration, 0).toFixed(1)
      : "0.0"

    let token: string

    switch (metric.category) {
      case "db":
        token = `db${++dbIndex}`
        break
      case "external":
        token = `ext${++externalIndex}`
        break
      default:
        token = `app${++handlerIndex}`
        break
    }

    const description = metric.label
      ? `;desc="${sanitizeDescription(metric.label)}"`
      : ""

    return `${token};dur=${duration}${description}`
  })

  return parts.join(", ")
}

function finalizeServerTiming() {
  const store = getStore()
  if (!store) return null
  return formatMetrics(store.metrics)
}

export async function runWithServerTiming<T>(fn: () => Promise<T>) {
  return timingStorage.run({ metrics: [] }, fn)
}

export function recordHandlerTiming(label: string, duration: number) {
  pushMetric({ category: "handler", label, duration })
}

async function timeOperation<T>(
  category: Exclude<TimingCategory, "handler">,
  label: string,
  operation: () => Promise<T> | T
) {
  const start = performance.now()

  try {
    return await operation()
  } finally {
    pushMetric({
      category,
      label,
      duration: performance.now() - start,
    })
  }
}

export function timeDatabase<T>(label: string, operation: () => Promise<T> | T) {
  return timeOperation("db", label, operation)
}

export function timeExternal<T>(label: string, operation: () => Promise<T> | T) {
  return timeOperation("external", label, operation)
}

export function withServerTiming<
  Handler extends (...args: any[]) => Response | Promise<Response>
>(handler: Handler, label?: string): Handler {
  const wrapped = (async (
    ...args: Parameters<Handler>
  ): Promise<Response> => {
    return runWithServerTiming(async () => {
      const start = performance.now()

      try {
        const response = await handler(...args)
        recordHandlerTiming(label ?? handler.name ?? "handler", performance.now() - start)

        const headerValue = finalizeServerTiming()
        if (headerValue) {
          const existing = response.headers.get("Server-Timing")
          response.headers.set(
            "Server-Timing",
            existing ? `${existing}, ${headerValue}` : headerValue
          )
        }

        return response
      } catch (error) {
        recordHandlerTiming(label ?? handler.name ?? "handler", performance.now() - start)
        throw error
      }
    })
  }) as Handler

  return wrapped
}

