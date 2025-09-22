# Streaming & Suspense Performance Metrics

## Measurement setup

- Environment: local Next.js dev server (`pnpm dev --hostname 0.0.0.0 --port 3000`).
- Tooling: `curl -w` to capture `time_starttransfer` (proxy for Time to First Paint) and `time_total`.
- Each measurement taken twice, ignoring the first run that includes compilation cost.

## Dashboard-related routes

| Route | Scenario | `time_starttransfer` | `time_total` | Notes |
| --- | --- | --- | --- | --- |
| `/bookings` | Before streaming panels | 0.099 s | — | Baseline static cards, no simulated latency. |
| `/bookings` | After streaming panels | 0.149 s | 0.484 s | Skeletons stream in ~150 ms while booking stats resolve after simulated 380 ms data fetch. |
| `/documents` | Before shared skeletons | 0.146 s | — | Inline skeleton markup duplicated per tab. |
| `/documents` | After shared skeletons | 0.112 s | 0.120 s | Centralised skeleton components cut TTFP by ~23%. |

## Observations

- Splitting booking stats into an async server component plus `<Suspense>` keeps first paint under 150 ms even with a ~380 ms mocked data fetch. Users immediately see the skeleton instead of waiting on network latency.【ea28cb†L1-L4】
- Documents now reuse the dashboard skeleton primitives, dropping `time_starttransfer` from 146 ms to 112 ms (≈23% faster) while also reducing duplicated markup.【896555†L1-L3】【e1a71e†L1-L3】
- New dashboard panels stream independently, so high-latency sections no longer block faster data from painting. Skeletons provide consistent layout stability across the dashboard, bookings, and documents surfaces.
