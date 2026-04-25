import { createStructuredLogger } from "@/lib/observability/logger"

export type CounterMetricName =
  | "payment_attempts_total"
  | "payment_success_total"
  | "payment_failures_total"
  | "booking_conflicts_total"
  | "booking_conflict_validation_rejections_total"
  | "webhook_failures_total"
  | "webhook_delivery_success_total"
  | "webhook_delivery_failure_total"
  | "unmapped_payment_events_total"
  | "payment_reconciliation_failures_total"
  | "maintenance_sla_met_total"
  | "maintenance_sla_breaches_total"
  | "message_moderation_actions_total"
  | "auth_failures_total"

export type HistogramMetricName =
  | "webhook_delivery_success_latency_ms"
  | "webhook_delivery_failure_latency_ms"

export type OperationalMetricName = CounterMetricName | HistogramMetricName

export interface MetricTags {
  source: string
  provider?: string
  eventType?: string
  correlationId?: string
  tenantId?: string
  unitId?: string
  severity?: "critical" | "high" | "medium" | "low" | "warning"
  [key: string]: string | number | boolean | undefined
}

interface HistogramState {
  count: number
  sum: number
  min: number
  max: number
  samples: number[]
}

const metricsLogger = createStructuredLogger("route_handler", {
  component: "operational_metrics",
})

const counterStore = new Map<CounterMetricName, number>()
const histogramStore = new Map<HistogramMetricName, HistogramState>()

const MAX_HISTOGRAM_SAMPLES = 500

function pushHistogramValue(name: HistogramMetricName, value: number) {
  const existing =
    histogramStore.get(name) ?? {
      count: 0,
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      samples: [],
    }

  existing.count += 1
  existing.sum += value
  existing.min = Math.min(existing.min, value)
  existing.max = Math.max(existing.max, value)

  if (existing.samples.length >= MAX_HISTOGRAM_SAMPLES) {
    existing.samples.shift()
  }

  existing.samples.push(value)
  histogramStore.set(name, existing)
}

function percentileFromSamples(samples: number[], percentile: number) {
  if (samples.length === 0) {
    return 0
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((percentile / 100) * sorted.length) - 1)
  return sorted[index]
}

export function recordOperationalMetric(
  name: OperationalMetricName,
  value: number,
  tags: MetricTags
) {
  metricsLogger.info("operational_metric_recorded", {
    metricName: name,
    metricValue: value,
    tags,
  })

  if (name.endsWith("_ms")) {
    pushHistogramValue(name as HistogramMetricName, value)
    return
  }

  const metricName = name as CounterMetricName
  counterStore.set(metricName, (counterStore.get(metricName) ?? 0) + value)
}

export function incrementOperationalMetric(
  name: CounterMetricName,
  tags: MetricTags
) {
  recordOperationalMetric(name, 1, tags)
}

export function recordWebhookDeliveryMetric(params: {
  outcome: "success" | "failure"
  latencyMs: number
  tags: MetricTags
}) {
  const outcomeMetric =
    params.outcome === "success"
      ? "webhook_delivery_success_total"
      : "webhook_delivery_failure_total"
  const latencyMetric =
    params.outcome === "success"
      ? "webhook_delivery_success_latency_ms"
      : "webhook_delivery_failure_latency_ms"

  incrementOperationalMetric(outcomeMetric, params.tags)
  recordOperationalMetric(latencyMetric, params.latencyMs, params.tags)
}

export function getOperationalMetricsSummary() {
  const counters = Object.fromEntries(counterStore.entries())

  const histograms = Object.fromEntries(
    Array.from(histogramStore.entries()).map(([name, state]) => {
      const average = state.count > 0 ? state.sum / state.count : 0
      return [
        name,
        {
          count: state.count,
          average,
          min: Number.isFinite(state.min) ? state.min : 0,
          max: Number.isFinite(state.max) ? state.max : 0,
          p50: percentileFromSamples(state.samples, 50),
          p95: percentileFromSamples(state.samples, 95),
        },
      ]
    })
  )

  return {
    generatedAt: new Date().toISOString(),
    counters,
    histograms,
    health: {
      webhookFailureRate:
        (counters.webhook_delivery_failure_total ?? 0) /
        Math.max((counters.webhook_delivery_success_total ?? 0) + (counters.webhook_delivery_failure_total ?? 0), 1),
      bookingConflictValidationRejections: counters.booking_conflict_validation_rejections_total ?? 0,
      paymentReconciliationFailures: counters.payment_reconciliation_failures_total ?? 0,
    },
  }
}
