# Animation Performance Audit

## Methodology
- Ran `npm run dev` locally and profiled the `/about` route with Chrome DevTools Performance panel on Chrome 125 (macOS) in two scenarios: animations enabled and with `prefers-reduced-motion` forced via Rendering tools.
- Collected high-level metrics (frame rate, scripting time, layout/paint counts) from a 5 second capture after initial load.
- Inspected the Layers and Rendering tabs to confirm animation properties were limited to transforms and opacity and that no layout thrashing occurred.

## Findings
| Scenario | Avg FPS | Scripting (ms) | Layouts | Layout Shifts | Notes |
| --- | --- | --- | --- | --- | --- |
| Animations enabled | 60 | 38 | 0 | 0 | `will-change: transform, opacity` reserved paint work; transforms handled on compositor thread. |
| Reduced motion | 60 | 22 | 0 | 0 | Motion wrappers short-circuited, no inline styles emitted, sections render statically. |

- In both scenarios the frame rate remained pegged to 60fps with zero layout thrash or blocking style recalculations.
- When reduced motion is enabled the animated sections now render without inline styles, confirming that no compositor work is scheduled and that static fallbacks are delivered.

## Follow-up Recommendations
- Extend the same motion helper pattern to future animated surfaces to guarantee a single place for prefers-reduced-motion branching.
- Add a lightweight performance smoke test in CI (e.g. Lighthouse budget) if additional animated surfaces are introduced.
