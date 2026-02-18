import { createStructuredLogger } from "@/lib/observability/logger"
import { incrementOperationalMetric } from "@/lib/observability/metrics"

const ALLOWED = new Set([
  "payment_failures_total",
  "booking_conflicts_total",
  "webhook_failures_total",
] as const)

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const logger = createStructuredLogger("route_handler", {
    component: "ops_metrics_route",
    requestId,
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
      ...(body.tags ?? {}),
    })

    logger.info("ops_metric_ingested", {
      eventName: body.metricName,
      tags: body.tags ?? {},
    })

    return Response.json({ ok: true })
  } catch (error) {
    logger.error("ops_metric_ingestion_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    return Response.json({ error: "Bad request" }, { status: 400 })
  }
}
