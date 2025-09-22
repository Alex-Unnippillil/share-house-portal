# Layout Containment Performance Study

## Summary
- Applied Tailwind's `content-visibility-auto` and `contain-content` utilities to the messaging feed and amenity booking grids to defer paint work for offscreen records.
- Chrome Profiler sampling shows Total Blocking Time (TBT) improvements between 74–89 ms depending on the route, translating to a 28–32% reduction in main-thread blocking during initial navigation.
- Verified that above-the-fold sections rely solely on shared Tailwind utilities—no CSS Modules were present to override the new containment wrappers.

## Test Environment
- Hardware: Apple MacBook Pro (M2 Pro, 32 GB RAM).
- Browser: Chrome 125 stable.
- Network: Simulated Fast 3G using Chrome DevTools throttling.
- CPU Throttling: 4× slowdown via Chrome Profiler.
- Test Builds: Next.js production build served locally with `NEXT_RUNTIME=production`.

## Methodology
1. Captured a baseline performance profile for `/messaging` and `/bookings` prior to introducing layout containment. Each run used a hard refresh with the DevTools Performance panel recording for 30 seconds, stopping once the route finished hydrating.
2. Applied the Tailwind containment utilities to the long feeds and repeated the profiling workflow described above.
3. Extracted TBT metrics from the Profiler "Main" track summary for each recording and averaged three runs per scenario.
4. Audited the rendered DOM and stylesheet sources to confirm that no CSS Module overrides were shipping above the fold that could bypass the containment wrappers.

## Results
| Route | TBT Before (ms) | TBT After (ms) | Delta |
| --- | --- | --- | --- |
| /messaging | 268 | 184 | −84 ms (−31.3%) |
| /bookings (Book tab) | 279 | 190 | −89 ms (−31.9%) |
| /bookings (History tab) | 262 | 188 | −74 ms (−28.2%) |

## Additional Notes
- Chrome screen recordings show that content still materializes instantly when the feed scrolls into view; no flashes of unpainted content were observed.
- The regression tests in `tests/layout-containment.test.tsx` simulate scroll activation to ensure feed items remain discoverable after the containment wrappers are applied.
- We will continue monitoring Web Vitals via Vercel Analytics to verify the gains persist under real tenant traffic.
