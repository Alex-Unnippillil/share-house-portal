import { createStructuredLogger, getCorrelationId } from "@/lib/observability/logger"
import { incrementOperationalMetric } from "@/lib/observability/metrics"

const ALLOWED = new Set([
  "payment_attempts_total",
  "payment_success_total",
  "payment_failures_total",
  "booking_conflicts_total",
  "webhook_failures_total",
  "maintenance_sla_met_total",
  "maintenance_sla_breaches_total",
  "message_moderation_actions_total",
  "auth_failures_total",
] as const)

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const correlationId = getCorrelationId(req.headers, requestId)
  const logger = createStructuredLogger("route_handler", {
    component: "ops_metrics_route",
    requestId,
    correlationId,
  })

  try {
    const body = (await req.json()) as {
      metricName?: string
      tags?: Record<string, string | number | boolean>
    }

    if (!body.metricName || !ALLOWED.has(body.metricName as any)) {
      return Response.json({ error: "Invalid metric name" }, { status: 400 })
    }

    incrementOperationalMetric(body.metricName as any, {
      source: "ops_metrics_route",
      correlationId,
      ...(body.tags ?? {}),
    })

    logger.info("ops_metric_ingested", {
      eventName: body.metricName,
      lifecyclePhase: "request.completed",
      tags: body.tags ?? {},
    })

    return Response.json({ ok: true, correlationId }, {
      headers: { "x-correlation-id": correlationId },
    })
  } catch (error) {
    logger.error("ops_metric_ingestion_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    return Response.json({ error: "Bad request" }, { status: 400 })
  }
}
