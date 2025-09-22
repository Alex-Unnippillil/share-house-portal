# `/perf-test` performance route

The `/perf-test` route renders the most component-heavy dashboard experience with deterministic
fixture data. CI can hit this page directly to run Lighthouse or Playwright powered checks without
needing to seed a database or sign in.

## Fixture data contract

- Source JSON lives at [`tests/fixtures/perf/dashboard.json`](../../tests/fixtures/perf/dashboard.json).
- Load the data via [`loadPerfDashboardFixture`](../../lib/perf/load-dashboard-fixture.ts) to ensure
  the same payload is shared across the app, Playwright specs, and Lighthouse runs.
- The loader caches the parsed JSON in-memory and always returns a cloned object so downstream code
  can mutate the data without affecting other consumers.

## Local benchmarking

1. Install dependencies (`pnpm install`) to pick up Playwright.
2. Run the automated check:

   ```bash
   pnpm perf:route
   ```

   This command boots a temporary Next.js dev server on port `4319`, loads `/perf-test`, and verifies
   the rendered output against the fixture using Playwright. Override the defaults with:

   - `PERF_ROUTE_COMMAND` to customize the server start command (e.g. `"pnpm dev -- --port 4000"`).
   - `PERF_ROUTE_BASE_URL` if the route is already being served elsewhere.
   - `PERF_ROUTE_PORT` to change the default port when Playwright manages the dev server.

3. For Lighthouse profiling, point your runner at the same base URL once the page is up. Re-use
   `loadPerfDashboardFixture` so synthetic requests match the data rendered by the route.

## Production visibility

The route is intentionally omitted from primary navigation and marked `noindex`, so it won't surface
in production menus or search results. Direct navigation to `/perf-test` remains available for CI and
observability tooling.
