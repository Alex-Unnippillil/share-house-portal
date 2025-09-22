# Motion Design Guidelines

These guidelines codify how motion is used across the Share House Portal so that interactions feel responsive without
compromising accessibility.

## Respect user preferences

- Every animated component must gate motion behind a [`prefers-reduced-motion`](https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion)
  check and render an immediate static fallback when reduction is requested.
- Use the shared `useShouldReduceMotion` hook, which synchronously reads the media query via `useSyncExternalStore` so the
  fallback is available on the first paint.
- Expose a `data-motion` attribute on animated elements to make the applied state (`enabled` vs `reduced`) easy to inspect and
  to unlock automated testing.

## Animation primitives

- Limit transitions to **opacity** and **transform** properties. Avoid layout-changing properties such as `top`, `left`,
  `height`, or `width` because they trigger layout thrash and reduce perceived performance.
- Keep transition durations below **120 ms** and prefer easing curves such as `easeOut` that decelerate into the final state.
- Use staggered delays sparingly—when necessary keep offsets under 40 ms to avoid slow cascades.
- Treat scale adjustments as micro-interactions; cap the delta to ±0.05 to prevent jarring size changes.

## Testing

- Add Playwright coverage for any surface that introduces motion. Tests should:
  - Start a browser context with `reducedMotion: "reduce"` and assert that animated elements report `data-motion="reduced"`.
  - Ensure inline styles do not reintroduce `transform` or `opacity` transitions when motion is disabled.
- Integrate the tests into `npx playwright test` so that CI blocks regressions automatically.

## Implementation checklist

- [ ] Guard all Framer Motion components with the shared `useShouldReduceMotion` hook.
- [ ] Provide semantic fallbacks (static markup, no transform styles) when motion is disabled.
- [ ] Update the design documentation when introducing new motion patterns or easing curves.
- [ ] Audit legacy components before launch to ensure they conform to these rules.
