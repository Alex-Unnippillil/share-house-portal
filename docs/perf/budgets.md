# Performance Budgets

## Overview
Roomsily enforces performance budgets for our highest traffic tenant
workflows to protect page speed regressions before they reach production.
Budgets are declared in [`config/performance.ts`](../../config/performance.ts)
and currently cover Largest Contentful Paint (LCP) and Time to Interactive
(TTI) for the landing page, dashboard, messaging, documents, payments, and
the internal metrics dashboard.

The middleware injects these budgets into a `Server-Timing` header so
engineers can inspect them in the browser devtools, and the `app/perf/metrics`
dashboard surfaces the live numbers collected from the navigation timing
APIs next to the configured budgets.

## CI enforcement workflow
1. **Build + start** – The `perf:ci` script runs `pnpm build` and boots the
   production server using Next's Node API.
2. **Collect metrics** – Lighthouse is launched headlessly for every route
   defined in `config/performance.ts`. We only collect the `performance`
   category and extract the LCP/TTI audits.
3. **Compare vs. budgets** – Actual values are compared with the configured
   budgets. Missing metrics (for example, if Lighthouse cannot gather LCP)
   are treated as failures to force investigation.
4. **Persist report** – Results are written to
   `app/perf/metrics/latest.json` (ignored by git) and rendered inside the
   `/perf/metrics` dashboard for quick inspection.
5. **Fail the build** – Any budget overage sets a non-zero exit code so the
   CI job fails early.

Integrate the `pnpm perf:ci` script into GitHub Actions after lint/test to
ensure performance regressions block merges. The command is deterministic
and portable because it launches its own Next.js server and Chrome runtime.

## Local usage
- `pnpm perf:check` – Runs Lighthouse against the existing production build
  in `.next`. Run `pnpm build` first if you do not have fresh artifacts.
- `pnpm perf:ci` – Convenience script that builds and then executes the
  Lighthouse run.

After either command finishes you can refresh `/perf/metrics` in a local dev
server to review the latest report along with the real-time browser metrics.

## Tuning budgets
1. Update or add route entries in `PERFORMANCE_BUDGETS` inside
   `config/performance.ts`. Budgets inherit the default values declared at
   the top of the file.
2. Run `pnpm perf:check` and iterate until the route comfortably clears the
   threshold (leave headroom for future changes).
3. Commit the updated configuration and, if necessary, note the reasoning
   for higher/lower budgets in the pull request description.

## Debugging tips
- Inspect the `Server-Timing` header in the network panel to confirm the
  middleware is shipping the configured budgets.
- Open `/perf/metrics` while developing to compare live navigation timings
  with the budgets and the most recent CI report.
- When a CI run fails, scroll up in the logs to see the per-metric breakdown
  emitted by `scripts/run-performance-budgets.ts`. Lighthouse failures also
  persist the raw values in `app/perf/metrics/latest.json`.
