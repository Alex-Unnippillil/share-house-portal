# KPI cache refresh pipeline

The dashboard now reads from a persisted cache (`public.kpi_cache`) that is refreshed by a Supabase Edge Function. This document covers deployment, scheduling, and alerting so the cache stays healthy in production.

## Components

| Layer | Purpose |
| --- | --- |
| `public.calculate_dashboard_kpis()` | PL/pgSQL helper that aggregates rent, maintenance, visitor, lease, and document KPIs.
| `public.kpi_cache` | Stores the most recent KPI payload, metadata, TTL, and any error message written by the refresh job.
| `supabase/functions/kpi-cache-refresh` | Edge function invoked by cron. It recalculates KPIs, upserts the cache row, records timing, and fires failure webhooks.

## Deploying the edge function

```bash
# Ensure env vars exist in Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# CRON_SECRET (arbitrary bearer token), and optional KPI_CACHE_ALERT_WEBHOOK.
supabase functions deploy kpi-cache-refresh \
  --project-ref <project-ref> \
  --no-verify-jwt
```

After deployment, record the public invoke URL for use in the scheduler (format: `https://<project-ref>.functions.supabase.co/kpi-cache-refresh`).

## Scheduling with Supabase cron

Create a cron trigger that calls the function on a fixed cadence (example: every 5 minutes):

```bash
supabase functions schedule create kpi-cache-refresh \
  --project-ref <project-ref> \
  --cron "*/5 * * * *" \
  --request-url "/kpi-cache-refresh" \
  --request-method POST \
  --headers "Authorization=Bearer ${CRON_SECRET}"
```

### Operational notes

- Rotate `CRON_SECRET` periodically; update the schedule headers and the `CRON_SECRET` secret in the project.
- The function writes `compute_duration_ms`, `computed_at`, `expires_at`, and any `error` string into `public.kpi_cache`. Monitoring this table allows quick visibility into stale caches.
- The cache TTL is 15 minutes. The Next.js loader treats anything older than that as stale and will trigger a recalculation on-demand.

## Failure alerts

Set the optional webhook environment variable to receive alerts (Slack, MS Teams, PagerDuty, etc.):

```bash
supabase secrets set KPI_CACHE_ALERT_WEBHOOK=https://hooks.slack.com/services/XXX/YYY/ZZZ \
  CRON_SECRET=<strong-random-string> \
  --project-ref <project-ref>
```

When the refresh fails (including database errors or auth misconfiguration) the function posts `"KPI cache refresh failed: <message>"` to the webhook and persists the error column in `public.kpi_cache` for auditability.

## Verifying end-to-end

1. Manually trigger a refresh: `curl -X POST https://<project-ref>.functions.supabase.co/kpi-cache-refresh -H "Authorization: Bearer ${CRON_SECRET}"`.
2. Inspect `public.kpi_cache` – `computed_at` should update and `error` should be `NULL`.
3. Load the dashboard. The header shows the data source (`cache` vs `recalculated`) and the measured load time, which should remain ≤ 80 ms for cache hits.
