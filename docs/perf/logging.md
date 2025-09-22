# Performance Logging & Alerting

This document describes how Share House Portal records high latency samples for Supabase activity and API route handlers, how the data is aggregated, and how to configure downstream alerts.

## Instrumentation Overview

The Supabase helper factory in [`lib/supabase.ts`](../../lib/supabase.ts) wraps every client with a fetch interceptor. For each Supabase REST request the wrapper measures the elapsed time, maintains a sliding window of recent durations, and writes samples that fall above the calculated p95 or p99 percentile into `performance_logs`. The helper also exposes `recordPerformanceSample`, which is used by `app/api/_middleware.ts` to proxy API route handlers and capture request latency at the edge before handing the request back to Next.js.

Key properties of the instrumentation:

- Percentile calculations are performed per logical key (for example, `supabase:profiles:GET` or `api:/api/documents:POST`) with a bounded in-memory window of the 200 most recent durations.
- A minimum of 20 observations is required before the module begins sampling outliers. This avoids noisy alerts while a process is warming up.
- Outlier samples are written asynchronously using the Supabase service role key (never on the client). Failures to persist are logged in development but do not disrupt request flow.
- Metadata for each sample includes the helper that executed the operation, HTTP method, response status code, and any optional context added by the caller (for example the originating route).

## API Middleware Proxy

`app/api/_middleware.ts` runs on the edge for `/api/*` requests. When a request enters the middleware:

1. It injects a guard header (`x-share-house-skip-api-middleware`) to prevent infinite recursion.
2. The middleware proxies the request to the intended API route and waits for the response.
3. Once the response resolves (or throws), the middleware pushes the recorded duration to `recordPerformanceSample` with a key in the form `api:{pathname}:{METHOD}`.

This design allows us to measure full handler latency—including middleware, route handler logic, and any downstream I/O—without modifying each API route individually.

## Database Schema

The Supabase migration `20250109_performance_monitoring.sql` provisions three tables that back the monitoring pipeline:

### `performance_logs`

Stores raw high-latency samples captured from the wrappers.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `created_at` | `timestamptz` | Insertion timestamp. |
| `source` | `text` | Either `supabase-client` or `api-middleware`. |
| `key` | `text` | Logical identifier, e.g. `supabase:profiles:GET`. |
| `helper` | `text` | Helper/module that executed the operation. |
| `environment` | `text` | Execution environment (`server`, `browser`, `edge`, or `worker`). |
| `duration_ms` | `numeric` | Duration of the sampled request. |
| `threshold` | `text` | Which percentile the sample crossed (`p95` or `p99`). |
| `calculated_p95_ms` | `numeric` | Snapshot of the current p95 for the window. |
| `calculated_p99_ms` | `numeric` | Snapshot of the current p99 for the window. |
| `sample_size` | `integer` | Number of observations used to calculate the percentiles. |
| `status_code` | `integer` | HTTP status code when available. |
| `metadata` | `jsonb` | Additional context (route, query parameters, request ID, error message, etc.). |

### `performance_thresholds`

Defines alerting windows and channel configuration.

| Column | Type | Notes |
| --- | --- | --- |
| `target` | `text` | Matches `performance_logs.key`. Unique per record. |
| `window_interval` | `interval` | Analysis window (defaults to 15 minutes). |
| `max_p95_ms` / `max_p99_ms` | `numeric` | Optional absolute thresholds. |
| `max_p95_count` / `max_p99_count` | `integer` | Optional breach counters for the window. |
| `slack_webhook_secret` | `text` | Name of the Vault secret that stores the Slack webhook URL. |
| `email_webhook_secret` | `text` | Name of the Vault secret containing an email provider webhook URL. |
| `email_recipients` | `text[]` | Recipients to notify for email alerts. |
| `metadata` | `jsonb` | Arbitrary configuration metadata (for example, custom email subjects). |
| `last_triggered_at` | `timestamptz` | Timestamp of the most recent alert. |
| `active` | `boolean` | Enables/disables the threshold definition. |

### `performance_alerts`

Persists alert executions for auditing.

| Column | Type | Notes |
| --- | --- | --- |
| `target` | `text` | Threshold key that triggered the alert. |
| `window_start` / `window_end` | `timestamptz` | Time window evaluated. |
| `p95_duration_ms` / `p99_duration_ms` | `numeric` | Worst observed percentiles within the window. |
| `p95_breach_count` / `p99_breach_count` | `integer` | Count of sampled breaches. |
| `sample_size` | `integer` | Number of samples considered. |
| `notification_status` | `text` | `sent`, `failed`, or `skipped`. |
| `metadata` | `jsonb` | Copy of the payload sent to downstream channels. |

## Scheduled Aggregation & Alerts

`process_performance_metrics()` runs every five minutes via `pg_cron`. For each active row in `performance_thresholds` it:

1. Aggregates the outlier samples from `performance_logs` that fall within the configured window.
2. Compares the aggregated metrics to the defined limits (absolute percentile values and/or breach counts).
3. Sends Slack and/or email notifications when limits are exceeded.
4. Records the outcome in `performance_alerts` and updates `last_triggered_at`.

Slack and email integrations rely on Supabase Vault secrets so sensitive URLs are not stored in plaintext. Before enabling alerts set the secrets referenced by `slack_webhook_secret` and `email_webhook_secret` using the Supabase CLI, for example:

```sh
supabase secrets set SLACK_PERF_ALERT_WEBHOOK="https://hooks.slack.com/services/..."
supabase secrets set RESEND_PERF_ALERT_WEBHOOK="https://api.resend.com/emails"
```

Then create a threshold record pointing to those secret names:

```sql
insert into public.performance_thresholds (
  target,
  description,
  window_interval,
  max_p99_ms,
  max_p99_count,
  slack_webhook_secret,
  email_webhook_secret,
  email_recipients,
  metadata
) values (
  'api:/api/documents:POST',
  'Document upload API should respond within 1.5 seconds',
  interval '10 minutes',
  1500,
  5,
  'SLACK_PERF_ALERT_WEBHOOK',
  'RESEND_PERF_ALERT_WEBHOOK',
  array['ops@sharehouse.example'],
  jsonb_build_object('email_subject', 'Document upload latency alert')
);
```

## Querying the Data

Use the logs table to inspect recent outliers:

```sql
select created_at,
       key,
       duration_ms,
       threshold,
       metadata->>'status' as status,
       metadata->>'error' as error
from public.performance_logs
where created_at > now() - interval '1 hour'
order by created_at desc
limit 50;
```

To review recent alerts:

```sql
select created_at,
       target,
       notification_status,
       p99_duration_ms,
       metadata->'metrics'->>'p99_count' as p99_breaches
from public.performance_alerts
order by created_at desc
limit 20;
```

## Operational Notes

- The logging helpers only persist samples when running server-side with `SUPABASE_SERVICE_ROLE_KEY` available. Client-side instrumentation still maintains percentiles but skips persistence to avoid exposing elevated credentials.
- Ensure `pg_cron`, `pg_net`, and `vault` extensions remain enabled in every environment where alerts should run.
- Because only outlier samples are stored, percentile statistics inside `performance_logs` reflect the state at the time of sampling. Use the aggregated metrics to understand whether percentile limits are consistently breached.
- Adjust `MIN_SAMPLE_SIZE_FOR_ALERT` or `SAMPLE_WINDOW_SIZE` in `lib/supabase.ts` if you need a larger baseline before sampling begins.
