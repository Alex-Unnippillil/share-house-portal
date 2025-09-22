# Supabase Query Cost Observability

This document explains how Supabase calls are instrumented, logged, and reviewed within the Share House Portal codebase.

## Runtime Instrumentation

- Supabase client factories (`utils/supaone.tsx`, `utils/supabase/server.ts`, etc.) now wrap all REST calls with `createInstrumentedFetch`.
- Each call is timed end-to-end. Row counts are inferred from the response body or `content-range` headers.
- Query metadata (route, actor, operation) is derived from the active `QueryContext`. Server routes populate this context via `runWithQueryContext` and automatically propagate a `traceId`.
- Logs are inserted into `observability.query_costs` using a lightweight service-role client. Inserts are skipped for the logging table itself to prevent infinite recursion.

```ts
const supabase = createSupbaseServerClient()
const { data } = await supabase.from('documents').select('*')
// Automatically records duration, row count, and trace metadata.
```

## Alert Thresholds

| Level | Threshold | Notes |
| ----- | --------- | ----- |
| Info | `< 500ms` | Baseline performance, no alert emitted. |
| Warning | `>= 500ms` | Optimize query (indexes, pagination) and monitor. |
| Critical | `>= 1000ms` | Immediate response required, triggers paging/Slack alert. |

Threshold constants live in `utils/observability/query-logging.ts` to guarantee consistency across logging and documentation.

## Schema Changes

A new migration (`supabase/migrations/20250110_observability_query_costs.sql`) provisions the logging surface:

```sql
create schema if not exists observability;
create table if not exists observability.query_costs (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid,
  route text,
  actor text,
  operation text,
  entity text,
  method text not null,
  path text not null,
  status_code integer,
  row_count integer default 0,
  total_exec_time_ms numeric not null,
  alert_level text,
  metadata jsonb,
  recorded_at timestamptz not null default timezone('utc', now())
);
```

## Dashboards & Reporting

- `docs/perf/query-costs-dashboard.mdx` renders the most recent slow queries and reiterates the thresholds.
- `docs/perf/query-costs-sample.csv` serves as a seed dataset for tooling demos.
- Use the SQL snippets in the MDX file to build Metabase or Looker tiles (top routes, percentile breakdowns, alert hit rates).

## Operational Playbook

1. **During incidents**: search by `trace_id` to connect slow queries with request logs or user sessions.
2. **After incidents**: export slow query slices to CSV, attach them to retrospectives, and capture `EXPLAIN ANALYZE` output.
3. **Preventative care**: add automated checks that fail CI if new queries consistently breach the warning threshold.

## Extensibility Ideas

- Integrate with Vercel Log Drains or Datadog to unify application logs and query costs.
- Add metadata enrichment (tenant ID, request duration) via `mergeQueryContext` prior to expensive operations.
- Surface alert-level counts on the internal admin dashboard to provide real-time feedback to property managers.
