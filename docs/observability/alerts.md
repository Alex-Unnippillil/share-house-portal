# Alerts

Alerting spans CloudWatch (for log-derived metrics) and the SaaS observability
backend for metric and trace-based SLOs. The tables below describe each alert,
its signal source, and its intended response playbook.

## CloudWatch (log-based)

| Name | Source | Condition | Action | Playbook |
| --- | --- | --- | --- | --- |
| `share-house-api-error-burst` | Metric filter `ShareHouseApiErrorCount` | `Sum` ≥ 5 events in 1 min | SNS → PagerDuty | Investigate recent deploys, review API logs for `requestId` correlation |
| `share-house-api-latency-spike` | Metric filter `ShareHouseApiHighLatencyCount` | `Sum` ≥ 3 events in 1 min | SNS → Slack `#share-house-ops` | Check Datadog/New Relic trace waterfall for upstream dependency latency |

Metric filters rely on structured log fields produced by Serilog:

- `level` – determines severity for the error burst alarm.
- `metrics.request.durationMs` – numeric duration used to flag slow requests.
- `requestId` – included in the log context and used for correlation.

## Datadog / New Relic

| Name | Type | Condition | Notes |
| --- | --- | --- | --- |
| `share-house-api-availability` | Datadog monitor / New Relic alert condition | Error rate (`http.server.request_count{status_code>=500}`) > 2% for 5 min | Backed by OTLP metrics tagged with `service.name` and `deployment.environment` |
| `share-house-api-latency` | Monitor / Condition | P95 latency (`http.server.request_duration`) > 750 ms for 5 min | Mirrors API golden signals dashboard |
| `collector-heartbeat` | Monitor / Condition | Collector self-metric `otelcol_exporter_sent_spans` has zero increase for 5 min | Detects stuck exporters or network issues |

### Notification routing

- Datadog: send critical monitors to the `share-house-pagerduty` integration.
- New Relic: route policies to Slack (`#share-house-ops`) for warning level and
  PagerDuty for critical.

## Runbooks

Each alert should reference a detailed runbook maintained in the internal
knowledge base. At minimum, include:

1. Owner and escalation path.
2. Dashboards to review when the alert fires.
3. Validation steps (e.g., CloudWatch Logs Insights queries, trace search).
4. Revert or mitigation steps.

Runbook links should be added to the alert definitions (e.g., Datadog monitor
`notes` field) and to the SNS topic description.
