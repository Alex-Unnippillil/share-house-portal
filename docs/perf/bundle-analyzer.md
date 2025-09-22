# Bundle Analyzer Workflow

## Running the analyzer

1. From the repository root, run `pnpm analyze:bundle`.
   - The script sets `ANALYZE=true` for `next build`, enabling `@next/bundle-analyzer`.
   - After the build completes, `scripts/analyze-bundle.js` parses `.next/analyze/client-stats.json`, creates `artifacts/bundle/top-modules.txt`, and enforces the module budget.
2. Open the generated bundle reports in `.next/analyze/*.html` for an interactive treemap if you want to drill deeper into chunk composition.

> **Tip:** If you only need to rebuild the text summary after a previous analyze run, execute `node scripts/analyze-bundle.js`. It will reuse the existing stats JSON.

## Inspecting results

- `artifacts/bundle/top-modules.txt` lists the 20 heaviest modules by gzipped size with their paths and sizes in kilobytes. The report regenerates on every run.
- `.next/analyze/client.html`, `.next/analyze/nodejs.html`, and `.next/analyze/edge.html` contain the visual reports emitted by `webpack-bundle-analyzer` for each runtime target. Serve them locally (e.g. `pnpm dlx serve .next/analyze`) to browse the treemaps.

## Enforcing gzipped budgets

- Each module is checked against the `BUNDLE_MODULE_GZIP_BUDGET_KB` environment variable (default: `150`).
- If any module exceeds the budget the script:
  - writes an over-budget section to `artifacts/bundle/top-modules.txt`, and
  - exits with status `1` so CI fails.
- Adjust the budget per run with `BUNDLE_MODULE_GZIP_BUDGET_KB=120 pnpm analyze:bundle`.

## Troubleshooting

- **Missing stats file:** Ensure `ANALYZE=true pnpm exec next build` runs successfully before invoking the analysis script directly.
- **Stale data:** Delete `.next/analyze` or rerun `pnpm analyze:bundle` to regenerate reports after dependency changes.
- **CI noise:** The script removes the previous `artifacts/bundle` directory on every run, keeping the report deterministic.
