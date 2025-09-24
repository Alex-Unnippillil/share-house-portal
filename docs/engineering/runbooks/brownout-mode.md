# Brownout Mode Runbook

## Purpose
Brownout mode keeps the Share House Portal responsive when infrastructure is under duress. Feature flags are driven by live load metrics so that expensive, non-critical UI pathways (streaming dashboards, analytics cards, and quick action launchers) are paused while rent, document, and maintenance flows remain fully available.

## Inputs & Thresholds
| Metric | Environment variable | Normal baseline | Elevated threshold | Critical threshold | Notes |
| --- | --- | --- | --- | --- | --- |
| CPU utilisation | `SYSTEM_CPU_UTILIZATION` | `0.42` | `>= 0.78` | `>= 0.92` | Values can be expressed as a fraction (`0.92`) or percentage (`92`). |
| Memory utilisation | `SYSTEM_MEMORY_UTILIZATION` | `0.56` | `>= 0.82` | `>= 0.94` | High memory pressure combines with other signals to trigger brownout. |
| p95 request latency (ms) | `SYSTEM_P95_LATENCY_MS` | `620` | `>= 950` | `>= 1500` | Captures end-to-end latency reported by Vercel/Datadog. |
| Event loop lag (ms) | `SYSTEM_EVENT_LOOP_LAG_MS` | `28` | `>= 120` | `>= 250` | Derived from Node.js diagnostics. |
| Error rate | `SYSTEM_ERROR_RATE` | `0.012` | `>= 0.035` | `>= 0.08` | Expressed as fraction (`0.05`) or percentage (`5`). |
| DB connection utilisation | `SYSTEM_DB_CONNECTION_UTILIZATION` | `0.33` | `>= 0.75` | `>= 0.9` | Prevents saturating Supabase connection pools. |

A brownout activates when one or more critical signals are observed or when at least two elevated signals are detected concurrently (stress score `>= 3`).

## Feature Flag Matrix
| Flag | Default | Automatic behaviour |
| --- | --- | --- |
| `brownoutMode` | `false` | Turns `true` whenever the stress detector activates. Can be hard-overridden via `NEXT_PUBLIC_FEATURE_BROWNOUT_MODE`. |
| `streamingDashboards` | `true` | Disabled for any elevated signal. Requires `brownoutMode === false` and overall stress level `normal`. |
| `dashboardMetrics` | `true` | Hidden while brownout is active or stress level is `critical`. |
| `quickActions` | `true` | Hidden when brownout is active or stress score `>= 3`. |

Environment overrides always win and should only be used for controlled testing or emergency mitigation.

## Incident Response Checklist
1. **Detect** – Confirm stress signals in Vercel (System Overview), Datadog APM, and Supabase connection dashboards. Capture the highest severity metrics.
2. **Verify brownout** – Check the `/dashboard` page; the banner should confirm safeguards and metrics cards/quick actions should be hidden. Review the `SystemStress.reasons` payload in logs if available.
3. **Communicate** – Notify #oncall-alerts with severity, impacted features, and estimated recovery window.
4. **Stabilise** – Scale Supabase or queue workers, roll back recent deployments, or shed traffic via Vercel protection rules.
5. **Recover** – Once metrics fall below elevated thresholds, brownout lifts automatically. Verify feature flags return to defaults and post-incident report.

## Manual Overrides
- Force a brownout (e.g. during maintenance): set `NEXT_PUBLIC_FEATURE_BROWNOUT_MODE=1` and redeploy. Quick actions, streaming dashboards, and analytics tiles will hide immediately.
- Clear a false positive: set `NEXT_PUBLIC_FEATURE_BROWNOUT_MODE=0` while investigating. Reset to empty afterwards to restore automatic control.

## Chaos Testing in Staging
1. **Prepare staging environment**
   ```bash
   vercel env edit staging SYSTEM_CPU_UTILIZATION 0.88
   vercel env edit staging SYSTEM_P95_LATENCY_MS 1300
   vercel env edit staging SYSTEM_ERROR_RATE 0.05
   ```
   Commit the changes so the next staging deployment picks up the overrides.
2. **Deploy staging** – Trigger a deploy (push to `staging` branch or use `vercel deploy --prebuilt`).
3. **Validate feature toggles**
   - Run `pnpm test -- --run tests/lib/feature-flags.test.ts` locally against the staging config.
   - Visit `/dashboard` on staging; confirm the brownout banner renders and both the metrics grid and quick actions card are replaced with placeholders.
4. **Restore defaults** – Remove the injected env vars or set them back to baseline values (`0.42`, `620`, `0.012`). Redeploy to confirm the UI returns to its normal state.

Document each chaos exercise in the on-call log, including timestamps, metrics injected, and screenshots of the UI changes.
