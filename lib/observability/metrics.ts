import { createStructuredLogger } from "@/lib/observability/logger"

export type OperationalMetricName =
  | "payment_attempts_total"
  | "payment_success_total"
  | "payment_failures_total"
  | "booking_conflicts_total"
  | "webhook_failures_total"
  | "unmapped_payment_events_total"
  | "maintenance_sla_met_total"
  | "maintenance_sla_breaches_total"
  | "message_moderation_actions_total"
  | "auth_failures_total"
  | "upstream_circuit_open_total"

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
