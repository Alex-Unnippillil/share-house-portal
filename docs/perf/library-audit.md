# Client Library Bundle Audit

_Analyzed on 2025-09-22 using `npm run bundle:analyze` followed by `npm run bundle:check`. Bundle sizes reflect gzip-compressed payloads from `.next/analyze/client-report.json`._

## Methodology
- Triggered a production build with bundle analysis enabled (`npm run bundle:analyze`).
- Parsed `client-report.json` to aggregate gzip sizes by npm package name.
- Flagged any dependency at or above the 50 kB gzip threshold and compared against the guardrails defined in `config/perf/bundle-budgets.json`.

## Dependencies ≥ 50 kB gzipped
| Package | Gzip Size (kB) | Budget (kB) | Mitigation Notes |
| --- | ---: | ---: | --- |
| next | 65.1 | 70.3 | Core framework runtime; need to keep client components sparse and lean on server rendering to avoid additional client bundles. |

## Recommendations
### next
- Audit current `"use client"` boundaries and migrate low-value interactive shells back to Server Components so we only hydrate the screens that truly require client-side state.
- Wrap infrequently viewed experiences (e.g., 3D feature prism, rich media dashboards) in `next/dynamic` so their client bundles load on demand instead of inflating the shared runtime chunk.
- Track the Next.js release roadmap (Next 15 + React 19) to adopt the slimmer flight/runtime bundles as soon as they are stable; schedule a dry run in staging to validate bundle deltas.

### Watchlist (sub-50 kB)
Even though they are currently under budget, the following libraries represent the bulk of the remaining client weight and should be considered when iterating on interactive features:
- `react-dom` (≈41.8 kB gzip) — unavoidable but keep an eye on additional client components that would pull more React DOM helpers.
- `framer-motion` (≈31.5 kB gzip) — consider motion primitives from `@radix-ui/motion` or CSS-based transitions for simple interactions.
- `@supabase/*` browser helpers (≈32.9 kB gzip combined) — prefer calling Supabase through server actions whenever possible to keep auth logic off the client.

## Phased Reduction Plan
| Phase | Dependency | Owner | Target Date | Success Criteria |
| --- | --- | --- | --- | --- |
| Phase 1 – Server-first audit | next | Platform Infra | 2025-10-15 | Reduce the shared `next` client runtime below 60 kB by converting at least three dashboard widgets to Server Components and gating optional UI via `next/dynamic`. |
| Phase 2 – Framework upgrade | next | Frontend Guild | 2025-11-30 | Ship the Next 15/React 19 upgrade (pending stability) and re-baseline bundles; target ≤55 kB gzip for the `next` runtime chunk, updating budgets accordingly. |

## Next Steps
- Keep `config/perf/bundle-budgets.json` in sync with any approved exceptions.
- Automate weekly bundle reports by wiring `npm run bundle:audit` into the scheduled performance CI job once it is green locally.
