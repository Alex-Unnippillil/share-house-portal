import { createStructuredLogger } from "@/lib/observability/logger"

export type OperationalMetricName =
  | "payment_failures_total"
  | "booking_conflicts_total"
  | "webhook_failures_total"

export interface MetricTags {
  source: string
  provider?: string
  eventType?: string
  tenantId?: string
  unitId?: string
  [key: string]: string | number | boolean | undefined
}

const metricsLogger = createStructuredLogger("route_handler", {
  component: "operational_metrics",
})

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
}

export function incrementOperationalMetric(
  name: OperationalMetricName,
  tags: MetricTags
) {
  recordOperationalMetric(name, 1, tags)
}
