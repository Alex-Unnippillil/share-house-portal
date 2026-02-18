# Alert Thresholds & Escalation Policy

## Critical alert thresholds

| Signal | Threshold | Window | Severity |
| --- | --- | --- | --- |
| Payment success rate (`payment_success_total / payment_attempts_total`) | < 92% | 15 minutes | P1 |
| Payment failures (`payment_failures_total`) | >= 5 failures | 10 minutes | P1 |
| Webhook failures (`webhook_failures_total`) | >= 3 failures per provider | 5 minutes | P1 |
| Auth failures (`auth_failures_total`) | > 3x baseline and >= 25 failures | 10 minutes | P1 |
| Booking conflicts (`booking_conflicts_total`) | >= 20 conflicts | 15 minutes | P2 |
| Maintenance SLA breach rate (`maintenance_sla_breaches_total / (maintenance_sla_breaches_total + maintenance_sla_met_total)`) | >= 10% | 24 hours | P2 |
| Message moderation surge (`message_moderation_actions_total`) | >= 30 actions | 30 minutes | P2 |
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

## Escalation paths by incident domain

- **Payments/Webhooks (P1)**: Platform On-call → Payments Tech Lead → Engineering Manager → Finance Ops liaison.
- **Auth/RLS anomalies (P1)**: Platform On-call → Security Engineer On-call → Security Lead → Compliance contact.
- **Booking, Maintenance, Moderation (P2)**: Resident Experience On-call → Operations Lead → Product Manager.

## Dashboard ownership

- Payments dashboard: Payments squad
- Booking + availability dashboard: Resident Experience squad
- Webhook reliability dashboard: Platform squad
- Security/auth dashboard (RLS and auth incidents): Security squad
- Launch-day command center dashboard: Incident commander + platform squad
