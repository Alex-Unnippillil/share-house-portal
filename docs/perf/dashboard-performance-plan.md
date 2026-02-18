# Dashboard Performance Optimization Plan

## Scope covered
This pass focuses on the four highest-traffic operational views:

- `/dashboard` (tenant dashboard)
- `/maintenance` (maintenance list and triage)
- `/bookings` (bookings calendar/history)
- `/dashboard/operations/finance` (admin reporting)

## Profiling workflows
Run these checks locally against a production build:

```bash
pnpm build
pnpm start
pnpm perf:routes
pnpm perf:api
```

Outputs:

- `artifacts/perf/route-latency.json` for initial load + interaction latency by screen.
- `artifacts/perf/api-latency.json` for API p50/p95 latency.

## Data-loading changes in this pass
- Added cursor-based API pagination for mirrored booking history (`/api/bookings/history`) to support infinite loading.
- Added paginated server-side operations datasets (`getFinanceRows`, `getMaintenanceRows`, `getBookingRows`, `getModerationRows`) and UI pagination controls.
- Reduced maintenance dashboard query payloads by selecting only needed columns and applying explicit query limits.

## Caching + freshness strategy
- **Low-volatility operational snapshots** (`maintenance`, `bookings`, `moderation`, `visitor` summary datasets) are cached with `unstable_cache` + time-based revalidation.
- **Payment rows and reconciliation-facing data** use `unstable_noStore` to preserve freshness.
- **Realtime booking history feed** API is explicitly `Cache-Control: no-store` and cursor-paginated for incremental hydration.

## Performance budgets enforced in CI
- Web vitals budgets are enforced in Lighthouse CI via `.lighthouserc.js`:
  - LCP <= 2500 ms
  - INP <= 200 ms
  - CLS <= 0.1
- API response p95 budgets are configured in `config/performance-budgets.json` and enforced via:
  - `pnpm perf:api`
  - `pnpm perf:budget`

`pnpm perf:ci` runs both checks and is wired into `.github/workflows/ci.yml` after production build.
