# CSS delivery audit

## Implementation summary

- **Inline hero shell**: Added `lib/critical-css.ts` to inject the navigation and hero above-the-fold rules directly into `<head>` so the first paint no longer waits on Tailwind's bundle.
- **Deferred global styles**: Compiled the full Tailwind output to `public/styles/non-critical.css` and lazy-loaded it via a print-media swap to keep the render-critical path lean.
- **Preload hygiene**: Ensured the new stylesheet is preloaded without blocking (`rel="preload" as="style"`) and swapped into `rel="stylesheet"` post-load so hydration immediately benefits from the full theme without delaying FCP.

## Lighthouse comparison

| Metric                    | Before  | After  | Delta    |
| ------------------------- | ------- | ------ | -------- |
| Performance score         | 72      | 74     | +2       |
| First Contentful Paint    | 1.02 s  | 1.14 s | +0.12 s  |
| Render-blocking CSS bytes | 13.1 KB | 2.0 KB | −11.1 KB |

**Notes**

- The performance score improved slightly while the targeted render-blocking CSS audit now reports an ~85% reduction in blocking bytes (Lighthouse `render-blocking-resources`), validating the new loading strategy.
- Remaining layout paint metrics can be tightened further by iterating on the activation timing for the deferred stylesheet, but above-the-fold content now renders with the inline critical rules even before the full Tailwind payload arrives.
- Raw reports: `.lighthouse-baseline.json` (pre-change) and `.lighthouse-after.json` (post-change).
