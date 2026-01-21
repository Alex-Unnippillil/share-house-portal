# Real User Monitoring Dashboards

The new Core Web Vitals pipeline publishes every metric with route and device
tags so that both Supabase and Datadog can be used as an analytics backend.
This document documents how to wire the new feed into each system, highlight
P50/P95 performance, and set up regression alerts.

## Supabase (Postgres) dashboard

1. Ensure the REST table defined by `NEXT_PUBLIC_SUPABASE_RUM_TABLE`
   (`rum_core_web_vitals` by default) exists with the following schema:

   ```sql
   create table if not exists rum_core_web_vitals (
     id uuid primary key default gen_random_uuid(),
     collected_at timestamptz not null,
     metric_name text not null,
     metric_id text not null,
     metric_value double precision not null,
     metric_delta double precision,
     metric_rating text,
     navigation_type text,
     route text,
     device text,
     environment text,
     user_agent text,
     connection text,
     session_id text,
     url text
   );

   create index if not exists rum_metrics_collected_at_idx
     on rum_core_web_vitals (collected_at desc);

   create index if not exists rum_metrics_route_device_idx
     on rum_core_web_vitals (route, device);
   ```

2. Add the following SQL view in Supabase SQL editor to compute daily P50/P95
   aggregates that power the dashboard charts:

   ```sql
   create or replace view rum_core_web_vitals_daily as
   select
     date_trunc('day', collected_at) as bucket,
     metric_name,
     route,
     device,
     percentile_cont(0.5) within group (order by metric_value) as p50,
     percentile_cont(0.95) within group (order by metric_value) as p95,
     count(*) as samples
   from rum_core_web_vitals
   where environment = coalesce(current_setting('app.current_env', true), 'production')
   group by 1,2,3,4;
   ```

3. Build a dashboard chart in Supabase Insights with the query above filtered
   to `metric_name in ('LCP', 'CLS', 'INP')` and add cards for:

   - **LCP P50/P95 by route** – stacked line chart grouped by `route`.
   - **CLS bad session rate** – ratio of `metric_rating = 'poor'` grouped by
     device.
   - **INP trending** – area chart with 7-day moving average.

4. Create a Supabase alert (Logs → Alerts) using the SQL below to notify
   `#alerts-perf` when P95 LCP grows by 20% day-over-day:

   ```sql
   with latest as (
     select bucket, route, p95,
            lag(p95) over (partition by route order by bucket) as prev_p95
     from rum_core_web_vitals_daily
     where metric_name = 'LCP'
     order by bucket desc
     limit 30
   )
   select *
   from latest
   where prev_p95 is not null
     and p95 > prev_p95 * 1.2;
   ```

## Datadog dashboard & monitors

1. Configure the RUM intake API key in `NEXT_PUBLIC_DATADOG_API_KEY` and
   optionally `NEXT_PUBLIC_DATADOG_SERVICE`. Events are shipped via the Logs API
   with tags `app`, `env`, `route`, `device`, and `metric`.

2. In Datadog create a new dashboard and add the following widgets:

   - **Query value:** `avg:last_15m:rum_core_web_vitals.metric_value{metric:lcp,env:production} by {route}`
     with P50 aggregator and a sparkline.
   - **Timeseries:** `p95:rum_core_web_vitals.metric_value{metric:lcp,env:production} by {route}` grouped by route.
   - **Query table:** `p95:rum_core_web_vitals.metric_value{metric:inp} by {device}` with conditional formatting for thresholds.
   - **Top list:** `count:rum_core_web_vitals.metric_rating{metric:cls,metric_rating:poor}` grouped by route.

3. Add a Datadog monitor with the query below to alert when p95 LCP breaches the
   2.5 s budget for more than two consecutive intervals:

   ```text
   p95("rum_core_web_vitals.metric_value{metric:lcp,env:production}") > 2.5
   ```

   Configure the evaluation window to 5 minutes over the last 3 intervals and
   route notifications to the `#alerts-perf` Slack channel.

4. Add an anomaly detection monitor for INP regressions:

   ```text
   avg(last_1h):anomalies(
     p95("rum_core_web_vitals.metric_value{metric:inp,env:production}"),
     'robust',
     2,
     direction='above'
   ) >= 1
   ```

   Trigger the monitor when the anomaly holds for 2 evaluation periods.

## Operational notes

- Every payload is tagged with `sessionId`, `route`, and `device`, so both
  backends can break down real user measurements by navigation or device class.
- The instrumentation uses `navigator.sendBeacon` when possible to avoid
  blocking navigation during unload events and falls back to `fetch` with
  `keepalive`.
- If a destination repeatedly throws synchronously it is disabled until the
  next page load, preventing noisy console errors during outages.
