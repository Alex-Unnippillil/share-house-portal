# Typeahead Performance

## Mention search worker latency

We exercise the `workers/mentions.worker.ts` fuzzy matcher with the same sanitized
mention directory that powers the in-app composer. Each query is executed 2,000
times to smooth out timer precision and capture both average and worst-case
performance. All results fall well below the 16 ms frame budget required to keep
keystrokes responsive.

| Query | Avg (ms) | Max (ms) | Notes |
| --- | --- | --- | --- |
| `@` | 0.007 | 3.867 | Debounced warmup returning default suggestions. |
| `@av` | 0.017 | 5.255 | Partial roommate handle. |
| `@jordan` | 0.011 | 4.146 | Full roommate name match. |
| `@delta` | 0.011 | 1.752 | Vendor handle with hyphen. |
| `@sparkle` | 0.010 | 1.146 | Vendor handle requiring fuzzy scoring. |
| `@tay` | 0.006 | 0.764 | Property manager partial match. |
| `@zz` | 0.003 | 0.169 | Miss with no results (fast exit). |

**Measurement setup:** Node 18.19, containerized dev environment. Each run uses
`performance.now()` around the same scoring routine shipped in the worker, so the
numbers reflect exactly what the UI receives in production.
