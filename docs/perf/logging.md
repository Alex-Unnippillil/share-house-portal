# Supabase Query Logging & Tracing

The Supabase client wrappers now emit structured console logs for every PostgREST query, RPC call, or storage request. Each log line captures the HTTP method, path, duration, row count (when available), emitted SQL text (when Supabase returns it), and a trace identifier that follows the request through middleware, API handlers, and database calls.

## Quick start

1. **Run any server code path** (API route, server action, or server component) and inspect the terminal running `pnpm dev`/`pnpm start`. Look for log lines that begin with `[Supabase]`.
2. **Provide your own trace id when testing** with `curl` or Postman by setting the `x-trace-id` header. If none is provided the middleware generates one automatically.
3. **Opt in to exact row counts** where needed by using Supabase's count hint: `supabase.from('profiles').select('*', { count: 'exact' })`. The logging wrapper will include the returned count alongside the observed data length.

Example output:

```
[Supabase] source=server-action trace=7d98fe92-8d0a-4b6f-9095-e9578e8cb07a GET /rest/v1/profiles status=200 durationMs=34 rows=3
```

Failures are logged via `console.error` with the same trace id to simplify cross-service debugging.

## Enabling verbose tracing

Verbose tracing is on by default—every Supabase request is wrapped by the logging middleware. Use the steps below to surface the most context:

1. **Local development**: run `NODE_ENV=development pnpm dev` so that JSON parse issues (for example, a 204 response) emit `console.debug` hints during logging.
2. **Custom trace identifiers**: send a header such as `x-trace-id: onboarding-flow` from tests or external clients. The middleware forwards this value to every downstream Supabase call so you can correlate HTTP, application, and database logs.
3. **Vercel / production visibility**: forward the application logs to your log drain (Datadog, New Relic, etc.). Filter for `[Supabase]` or the shared trace id to follow a request across services.
4. **API route correlation**: API handlers can access the active trace id via `headers().get('x-trace-id')`. Reuse it in any additional logging or outbound calls.

## Database observability views

The Supabase migration `20250214090000_observability_views.sql` creates an `observability` schema with two helper views backed by `pg_stat_statements`:

- `observability.top_slow_queries` — top 100 statements ordered by mean execution time, including min/max durations and rows per call.
- `observability.n_plus_one_candidates` — highlights statements executed frequently (`calls > 25`) that return roughly one row per call, a common N+1 signal.

Query them from the SQL editor or Supabase CLI:

```sql
select * from observability.top_slow_queries limit 20;
select * from observability.n_plus_one_candidates limit 20;
```

Both views are granted to the `authenticated` and `service_role` roles so they can power admin dashboards or scheduled reports without additional grants.

## Operational checklist

- Deploy the migration with `supabase db push` (or via CI) to enable the observability schema.
- Confirm your monitoring stack stores the `[Supabase]` logs with trace ids.
- When investigating performance issues, start with the new SQL views, then correlate the slow query back to the originating API call using the shared `x-trace-id`.
