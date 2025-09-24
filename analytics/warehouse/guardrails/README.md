# Warehouse Guardrails

This package codifies guardrails for analytical warehouse queries. It provides a
query watchdog that evaluates runtime and bytes scanned for every job. The
watchdog fans out alerts to Slack and generic webhooks and encodes the
escalation procedures required by the analytics team.

## Default thresholds

| Metric        | Warn at            | Critical at        |
| ------------- | ------------------ | ------------------ |
| Runtime       | 2 minutes          | 5 minutes          |
| Bytes scanned | 50 GiB             | 200 GiB            |

The thresholds can be customised per integration by passing overrides when
constructing the `QueryWatchdog` or when calling `runQueryWatchdog`.

## Alert channels

- **Slack**: Webhooks posted to `#analytics-notifications` for warnings and
  `#analytics-incidents` for critical triggers. The payload includes a preview of
  the offending SQL and instructions for the responder.
- **Generic webhook**: The full alert payload can be relayed to any downstream
  automation (PagerDuty Events API, Incident.io, etc.).

## Escalation policy

1. **Warning**
   - Notify: `#analytics-notifications`
   - Action: Acknowledge the alert in Slack and add a note in the warehouse ops
     log within 1 hour.
2. **Critical**
   - Notify: `#analytics-incidents`, `pagerduty:analytics-oncall`
   - Action: Page the analytics on-call immediately, open an incident in
     Incident.io, and escalate to the data engineering lead if unresolved after
     15 minutes.

The escalation copy above is embedded in the generated alerts so responders see
exactly what to do.

## Usage

```ts
import {
  HttpWebhookChannel,
  QueryWatchdog,
  SlackWebhookChannel,
} from "@/analytics/warehouse/guardrails"

const watchdog = new QueryWatchdog()

await watchdog.monitorQuery(queryEvent, [
  new SlackWebhookChannel({ webhookUrl: process.env.SLACK_GUARDRAILS_URL! }),
  new HttpWebhookChannel({ url: process.env.GUARDRAIL_WEBHOOK_URL! }),
])
```

The returned `MonitorResult` reports whether guardrails triggered and includes
all violations for logging and auditing.
