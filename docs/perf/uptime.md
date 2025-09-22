# Uptime Monitoring Playbook

The portal now performs scheduled uptime probes from the Americas, EMEA, and APAC edges to ensure `/health`, `/dashboard`, and `/bookings` remain reachable. This document explains how the probes run, how results are stored, and how to interpret the metrics.

## Execution Flow

| Component | Purpose |
| --- | --- |
| `.github/workflows/uptime.yml` | Runs every 30 minutes (and on demand) to execute the uptime probes. |
| `scripts/uptime-check.mjs` | Reads `config/uptime.json`, calls each endpoint per region, and records latency + status. |
| `config/uptime.json` | Declarative definition of regions, endpoints, failure thresholds, and runtime defaults. |
| `supabase/migrations/20250107_uptime_monitoring.sql` | Creates the `uptime_checks` table for storing historical results. |

Each workflow run resolves region-specific base URLs from environment variables, executes the probes sequentially, and records a row per `(region, endpoint)` combination. Latency is measured client-side using Node's high-resolution timer.

## Configuration Summary

`config/uptime.json` centralises every knob used by the monitoring job. The defaults are:

- **Request timeout:** 8 000 ms
- **Excerpt length:** 256 characters (response bodies are truncated before storage)
- **Consecutive failure threshold:** 3 strikes before an alert is emitted
- **Workflow failure on alert:** enabled (the GitHub Action exits non-zero once the threshold is crossed)

Region base URLs are supplied through secrets to keep production hosts out of the repository:

| Region | Label | Expected secret |
| --- | --- | --- |
| Americas | `Americas Edge` | `UPTIME_BASE_URL_AMERICAS` |
| EMEA | `EMEA Edge` | `UPTIME_BASE_URL_EMEA` |
| APAC | `APAC Edge` | `UPTIME_BASE_URL_APAC` |

You can override defaults or add endpoints by editing the JSON file and committing the changes. Local dry-runs are available via `pnpm run uptime:check` once the same environment variables are exported.

## Data Model

All observations land in the `public.uptime_checks` table. Key columns include:

| Column | Description |
| --- | --- |
| `checked_at` | UTC timestamp of the probe execution. |
| `region` / `region_label` | Machine and human readable identifiers for the edge location. |
| `endpoint` / `http_method` | Path and verb that were tested. |
| `status_code` & `success` | HTTP response metadata determining pass/fail. |
| `latency_ms` | Round-trip time recorded from the runner. |
| `consecutive_failures` | Rolling failure streak used to trigger alerts. |
| `response_excerpt` & `error_message` | Troubleshooting context captured on failure. |

Supabase exposes two helpful indexes for querying recent results:

```sql
-- last 24 hours of probes with failure streaks
delimiter $$
select
  region,
  endpoint,
  max(checked_at) as last_check,
  min(latency_ms) filter (where success) as best_latency_ms,
  avg(latency_ms) as avg_latency_ms,
  max(consecutive_failures) as highest_failure_streak,
  sum(case when success then 1 else 0 end)::decimal / count(*) as success_ratio
from public.uptime_checks
where checked_at >= now() - interval '1 day'
group by region, endpoint
order by region, endpoint;
$$;
```

## Alerting

When a probe fails, the script increments the stored `consecutive_failures` counter. Once the threshold is reached, two things happen:

1. The GitHub Action step logs the alert and, if `config.failWorkflowOnAlert` is `true`, exits with a non-zero status so failures surface in the Actions UI.
2. If `UPTIME_ALERT_WEBHOOK` is configured, a JSON payload containing the region, endpoint, status, latency, and failure reason is delivered to the webhook (compatible with Slack/Teams generic incoming webhooks).

Missing webhook secrets do not block data collection—the script logs a warning instead. Historical alerts can therefore be reconstructed by filtering for rows where `consecutive_failures` ≥ threshold.

## Operations Checklist

- **Rotate secrets** whenever endpoints move or credentials change (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, regional base URLs, webhook URL).
- **Update config** if new surfaces need monitoring or thresholds change; commit to keep automation reproducible.
- **Inspect results** in Supabase or any BI tool using the `uptime_checks` table. The sample SQL above provides a rolling success ratio.
- **Triaging alerts:** reconcile the webhook notification with entries in `uptime_checks` to differentiate transient blips from sustained downtime.

With this workflow in place, the team has end-to-end visibility from probe execution through to alert delivery for critical tenant-facing endpoints.
