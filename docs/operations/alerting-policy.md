# Alert Thresholds & Escalation Policy

## Critical alert thresholds

| Signal | Threshold | Window | Severity |
| --- | --- | --- | --- |
| Payment failures (`payment_failures_total`) | >= 5 failures | 10 minutes | P1 |
| Webhook failures (`webhook_failures_total`) | >= 3 failures per provider | 5 minutes | P1 |
| Booking conflicts (`booking_conflicts_total`) | >= 20 conflicts | 15 minutes | P2 |
| Data integrity violations (integrity job) | Any non-zero anomaly count | Each run | P1 |

## Notification channels

- **P1**: PagerDuty `Platform Primary`, Slack `#alerts-critical`, email to `incident-managers@roomsily.internal`
- **P2**: Slack `#alerts-ops`, Jira auto-ticket in `OPS` project
- **P3** (informational): Slack digest in `#ops-daily`

## Escalation timeline

1. T+0 min: auto-page on-call engineer and incident commander.
2. T+5 min: escalate to secondary on-call if unacknowledged.
3. T+10 min: escalate to Engineering Manager and Product Manager.
4. T+20 min: invoke external vendor support (Stripe/Supabase/Vercel) if outage suspected.

## Dashboard ownership

- Payments dashboard: Payments squad
- Booking + availability dashboard: Resident Experience squad
- Webhook reliability dashboard: Platform squad
- Security/auth dashboard (RLS and auth incidents): Security squad
