# Lighthouse Audit – 26 Sep 2024

## Test setup
- Command: `pnpm dlx lighthouse http://localhost:3000 --chrome-path=$(which google-chrome-stable) --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu" --preset=desktop --only-categories=performance --throttling-method=provided --output=json --quiet`
- Runs executed against the Next.js dev server (`pnpm dev`).
- Each scenario collected a single run focused on the Performance category.

## Results
| Scenario | Performance | LCP (ms) | FCP (ms) | TTI (ms) |
| --- | --- | --- | --- | --- |
| Before optimizations | 0.47 | 2247.86 | 984.57 | 8157.86 |
| After optimizations | 0.50 | 1967.18 | 1967.18 | 7794.76 |

## Notes
- The hero image now ships with a blur placeholder, tuned `sizes`, and remains prioritized to improve Largest Contentful Paint.
- Avatar imagery leverages `next/image` with deterministic sizing and fallbacks, reducing layout shift.
