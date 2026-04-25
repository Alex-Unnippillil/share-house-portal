import { requirePrivilegedApiAccess } from "@/lib/api-auth"
import { createStructuredLogger, getCorrelationId } from "@/lib/observability/logger"
import { getOperationalMetricsSummary, incrementOperationalMetric, type CounterMetricName } from "@/lib/observability/metrics"

const ALLOWED = new Set([
  "payment_attempts_total",
  "payment_success_total",
  "payment_failures_total",
  "booking_conflicts_total",
  "booking_conflict_validation_rejections_total",
  "webhook_failures_total",
  "webhook_delivery_success_total",
  "webhook_delivery_failure_total",
  "unmapped_payment_events_total",
  "payment_reconciliation_failures_total",
  "maintenance_sla_met_total",
  "maintenance_sla_breaches_total",
  "message_moderation_actions_total",
  "auth_failures_total",
] as const satisfies readonly CounterMetricName[])

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const correlationId = getCorrelationId(req.headers, requestId)

  const authContext = await requirePrivilegedApiAccess()
  if (authContext instanceof Response) {
    return authContext
  }

  return Response.json(
    {
      ok: true,
      correlationId,
      summary: getOperationalMetricsSummary(),
    },
    {
      headers: {
        "x-correlation-id": correlationId,
      },
    }
  )
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const correlationId = getCorrelationId(req.headers, requestId)
  const logger = createStructuredLogger("route_handler", {
    component: "ops_metrics_route",
    requestId,
    correlationId,
  })

  try {
    const authContext = await requirePrivilegedApiAccess()
    if (authContext instanceof Response) {
      return authContext
    }

    const body = (await req.json()) as {
      metricName?: string
      tags?: Record<string, string | number | boolean>
    }

    if (!body.metricName || !ALLOWED.has(body.metricName as any)) {
      return Response.json({ error: "Invalid metric name" }, { status: 400 })
    }

    incrementOperationalMetric(body.metricName as CounterMetricName, {
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
