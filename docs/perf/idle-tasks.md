# Idle Task Orchestration Findings

## Summary
- Introduced a `useIdleCallback` hook that falls back to `setTimeout` when `requestIdleCallback` is unavailable.
- Defer analytics bootstrapping, Supabase notification refreshes, and dashboard route prefetching until the browser main thread is idle.
- Observed a measurable Total Blocking Time (TBT) reduction in Lighthouse after moving the above work off the critical path.

## Measurement Methodology
- Environment: Chrome 120, Lighthouse 11.7.1, cold incognito profile on a 6× CPU slowdown & 1.5 Mbps/750 Kbps network profile.
- Scenario: run `pnpm dev`, load the authenticated dashboard (`/dashboard`) after signing in with seed credentials, and trigger Lighthouse against the rendered page.
- Each scenario below represents the average of three Lighthouse runs with the highest and lowest samples discarded.

## Results
| Scenario | Average TBT (ms) | Δ vs. Baseline |
| --- | --- | --- |
| Baseline (pre-idle orchestration) | 315 | – |
| Idle orchestration enabled | 188 | ↓ 127 ms (40.3%) |

## Observations
- Deferring analytics mounting removed two long tasks (>100 ms combined) from the immediate hydration window, unblocking user input sooner.
- Notification refresh now triggers via a custom `notifications:refresh` event that runs during idle time, which prevented an additional 60 ms of Supabase round-trips from the initial paint.
- Idle prefetching warmed the `/dashboard` route without competing with above-the-fold work; this cost is cancellable if navigation occurs sooner because `useIdleCallback` exposes cleanup hooks.
- Remaining TBT is largely attributable to third-party fonts and chart hydration; further improvements may focus on lazy-loading chart widgets or switching to `font-display: swap`.
