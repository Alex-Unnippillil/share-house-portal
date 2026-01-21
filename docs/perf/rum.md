# Real User Monitoring (RUM)

This document describes how we capture, store, and visualize real-user performance metrics for the Roomsily portal.

## Data flow overview

1. The browser collects Web Vitals (LCP, TTFB, INP, CLS) via `utils/metrics/web-vitals.ts`, which is automatically wired into Next.js through `app/reportWebVitals.ts`.
2. Samples are POSTed to `/api/perf-metrics` with a `Bearer` token that must match the Supabase service-role key.
3. The API validates the payload, enforces the performance budgets, and stores the record in `public.perf_metrics`.
4. Dashboards and alerts use the aggregated data to track regressions.

### Performance budgets

| Metric | Budget | Notes |
| --- | --- | --- |
| LCP | ≤ 2500 ms | Largest Contentful Paint should stay in the "good" band |
| TTFB | ≤ 800 ms | First byte target keeps the server responsive |
| INP | ≤ 200 ms | Interaction to Next Paint should feel instant |
| CLS | ≤ 0.1 | Cumulative Layout Shift must remain minimal |

Samples that exceed any budget are still stored but the API responds with `422` to surface the violation. The `budget_status` JSONB column contains `ok` and a `violations` array for downstream analytics.

### Table schema

`public.perf_metrics` keeps one row per flush from the client script. Important columns:

- `session_id` – browser session identifier persisted in `sessionStorage`
- `user_id` – Supabase user (if available)
- `metrics` – JSONB payload containing the tracked metrics
- `budget_status` – JSONB with `ok` flag and the list of budget violations
- `navigation_type`, `connection`, `viewport`, `locale`, `timezone` – context for segmenting samples

Use the migration in `supabase/migrations/20250103_perf_metrics_schema.sql` when provisioning databases.

## Dashboards

Create a Supabase Dashboard card (or use any BI tool pointed at the replica) with queries such as:

```sql
-- 75th percentile web-vitals grouped by route (last 7 days)
with samples as (
  select
    pathname,
    (jsonb_path_query_first(metrics, '$[*] ? (@.name == "LCP").value'))::numeric as lcp,
    (jsonb_path_query_first(metrics, '$[*] ? (@.name == "TTFB").value'))::numeric as ttfb,
    (jsonb_path_query_first(metrics, '$[*] ? (@.name == "INP").value'))::numeric as inp,
    (jsonb_path_query_first(metrics, '$[*] ? (@.name == "CLS").value'))::numeric as cls
  from public.perf_metrics
  where created_at >= now() - interval '7 days'
)
select
  pathname,
  percentile_disc(0.75) within group (order by lcp) as p75_lcp,
  percentile_disc(0.75) within group (order by ttfb) as p75_ttfb,
  percentile_disc(0.75) within group (order by inp) as p75_inp,
  percentile_disc(0.75) within group (order by cls) as p75_cls
from samples
group by pathname;
```

For quick status views, chart the share of rows where `budget_status ->> 'ok' = 'true'` grouped by environment or route.

## Alerts

Set up one of the following strategies:

- **Supabase Scheduled Function**: A nightly cron can run a SQL check for `budget_status ->> 'ok' = 'false'` above a threshold and send an email/slack notification using existing notification infrastructure.
- **Vercel Cron Job**: Hit an internal route that aggregates recent metrics and triggers Resend emails when budgets regress.
- **BI Tool Thresholds**: If using Metabase/Looker, create a pulse on the 75th percentile metrics crossing the budget.

Be sure to rotate the service-role key if alerts are sent externally.

## Enabling the client script

### Local development

1. Ensure `.env.local` contains the following values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="…"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="…"
   SUPABASE_SERVICE_ROLE_KEY="…"
   NEXT_PUBLIC_RUM_ENDPOINT="/api/perf-metrics"
   NEXT_PUBLIC_RUM_WRITE_TOKEN="$SUPABASE_SERVICE_ROLE_KEY"
   ```
2. Run `npm run dev`; the script loads automatically on every page. Inspect network traffic for `/api/perf-metrics` to confirm ingestion.
3. Use Supabase Studio to verify rows in `public.perf_metrics` and that `budget_status.ok` stays `true` during development.

### Vercel deployments

1. In each environment (Preview, Staging, Production) add:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_RUM_ENDPOINT` (defaults to `/api/perf-metrics` if omitted)
   - `NEXT_PUBLIC_RUM_WRITE_TOKEN` set to the same service-role key or a dedicated ingest key.
2. Redeploy the project so the client bundle receives the token.
3. Configure dashboards/alerts in the corresponding Supabase project; the admin RLS policy allows property managers and admins to query the data.
4. Monitor the Vercel logs for `Performance budget(s) exceeded` responses to catch regressions early.

> **Security note:** If you prefer to avoid exposing the full service-role key to the client, create a proxy or edge function that injects the header server-side and use a short-lived token in `NEXT_PUBLIC_RUM_WRITE_TOKEN`.
