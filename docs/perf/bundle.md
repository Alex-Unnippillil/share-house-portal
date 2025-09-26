# JavaScript Bundle Budgets

Roomsily tracks the size of the primary App Router bundle so tenant dashboards
stay responsive on constrained networks. Bundle reports are generated with
[`next-bundle-analyzer`](https://github.com/vinayakkulkarni/next-bundle-analyzer)
and stored under `.next/analyze/`.

## Running the analyzer locally

1. Install dependencies (`npm install`).
2. Build with the analyzer enabled:

   ```bash
   npm run analyze
   ```

   This produces HTML and JSON reports at `.next/analyze/bundles.html` and
   `.next/analyze/bundles.json`.
3. Evaluate the main entry bundle against the default budget:

   ```bash
   npm run bundle:budget
   ```

   The script sums every chunk flagged as an initial dependency of
   `app/page` (override with `MAIN_BUNDLE_ENTRYPOINT`) and reports the chosen
   metric (defaults to gzip size). Budgets can be tuned for local experiments:

   ```bash
   MAIN_BUNDLE_MAX_KB=520 MAIN_BUNDLE_METRIC=parsed npm run bundle:budget
   ```

## CI enforcement

The `css-size` workflow now includes a "Analyze JavaScript bundle" job. On every
push and pull request it:

- installs dependencies via `npm ci`,
- runs `npm run analyze` to refresh `bundles.json`,
- enforces `MAIN_BUNDLE_MAX_KB` (480&nbsp;kB by default) using
  `npm run bundle:budget`, and
- uploads the analyzer HTML/JSON artifacts for reviewers to inspect.

Any regression beyond the configured ceiling fails the build and surfaces the
breakdown in the GitHub Actions job summary.

## Remediation checklist for budget overruns

1. **Identify the offenders.** Re-run `npm run analyze` locally and open
   `.next/analyze/bundles.html` (or inspect the CI artifact) to pinpoint the
   largest chunks reported by `npm run bundle:budget`.
2. **Split heavy routes.** Convert large components into dynamic imports with
   `{ ssr: false }` or route-level code-splitting so rarely used panes (e.g.
   3D floorplans) load on demand.
3. **Purge unused dependencies.** Remove dead packages, tree-shake optional
   exports, and replace broad imports (`react-icons/all`) with targeted
   subpaths.
4. **Collapse duplicate utilities.** Consolidate shared helpers under
   `utils/` or component folders so they compile once. Watch for copies of
   date-fns or charting libraries imported with different entrypoints.
5. **Compress rich media.** Convert large JSON/GLTF fixtures and static data to
   streamed API responses or lighter formats before bundling.
6. **Re-run the budget check.** After each optimization run `npm run analyze`
   followed by `npm run bundle:budget`. Keep iterating until the bundle falls
   below the configured ceiling, then update the pull request with a short
   summary of the wins.

Avoid raising `MAIN_BUNDLE_MAX_KB` unless the feature team and platform owners
agree on a new target—document any increases in this file when they are
unavoidable.
