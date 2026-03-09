# Launch-Day Monitoring Dashboard

## Objective

Provide a real-time command-center view of traffic health, application reliability, and conversion across the tenant funnel during launch windows.

## Dashboard layout

### 1) Traffic & platform health (top row)

- Request throughput (RPM) by route group (`/api/*`, `/payments`, `/bookings`, `/dashboard`).
- P95 latency by route group.
- Error rate (5xx and 4xx separately).
- Deployment markers and Vercel build IDs.

### 2) Critical reliability indicators (middle row)

- Core readiness status from `GET /api/readiness` (default probe mode: app process + Supabase).
- Optional dependency panel from `GET /api/readiness?full=1` (Stripe, Cal.com, Documenso) for deeper diagnostics.
- Webhook failure rate (`webhook_failures_total`) split by provider (`stripe`, `calcom`, `documenso`).
- Auth failure trend (`auth_failures_total`) with baseline overlay.
- Booking conflict count (`booking_conflicts_total`) and conflict % of validation attempts.
- Maintenance SLA breach rate (`maintenance_sla_breaches_total` vs `maintenance_sla_met_total`).

### 3) Tenant conversion funnel (middle row)

- Sign-in success ratio (auth successes vs auth failures).
- Payment checkout session created → webhook payment success conversion.
- Amenity validation checks → successful bookings conversion.
- Onboarding completion ratio (started vs completed).

### 4) Moderation & operations posture (bottom row)

- Moderation actions per 30 min (`message_moderation_actions_total`) by action type.
- Open incidents by severity (P1/P2/P3).
- PagerDuty acknowledgement latency.
- Runbook link panel (payment outage, webhook degradation, auth incident).

## Live filters

All widgets should support filters for:

- Environment (`staging`, `production`)
- Property / tenant cohort
- Correlation ID drill-down
- Time range (default 30m, optional 5m/2h/24h)

## Launch-day operating cadence

1. 30 minutes before launch: validate data freshness and alert rules in test mode.
2. At launch: pin dashboard to incident channel and assign one operator per dashboard section.
3. Every 15 minutes: snapshot funnel conversion and error budget burn in incident thread.
4. On threshold breach: jump from widget to correlated logs via `correlationId` and execute linked runbook.

## Alerting split: core vs optional dependencies

- **Core failure alert (P1):** Trigger when `/api/readiness` returns `degraded` or `down` for two consecutive windows. Treat as tenant-impacting because core checks cover application process and Supabase DB connectivity.
- **Optional failure alert (P2):** Trigger when `/api/readiness?full=1` reports any optional dependency as `degraded` or `down` for three consecutive windows. Keep the app available, but route to the owning integration responders.
- **Escalation rule:** Promote optional incidents to P1 only if business KPIs (payment conversion, booking completion, lease workflows) drop below launch thresholds.

## Minimum data sources

- Vercel Analytics + function logs
- Structured logs from `createStructuredLogger`
- Operational metric stream from `recordOperationalMetric`
- PagerDuty incidents and acknowledgements
