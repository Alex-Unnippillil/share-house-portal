# Progressive disclosure for expensive surfaces

We defer rendering of heavyweight UI such as analytics charts, holographic/3D previews, and third-party widgets until residents explicitly opt into them. This keeps the dashboard responsive on lower-powered devices and avoids shipping megabytes of unused JavaScript on first paint.

## Patterns

- **Tabbed insights (`md` and larger):** group related high-cost panels behind shadcn `Tabs`. Set the default tab to the most critical metric and defer loading of other panels until the user activates them.
- **Accordion reveal (`sm` and smaller):** mirror the same content in a vertically stacked disclosure so mobile tenants can progressively reveal one surface at a time.
- **Dynamic imports:** always wrap these panels with `next/dynamic` and disable SSR (`ssr: false`) so the code-split bundle only loads after the relevant tab/accordion opens.
- **First-view gating:** track which surfaces have been opened and render a loading placeholder until the first reveal. Subsequent opens should reuse the hydrated component.

## Instrumentation

- Use `track` from `@vercel/analytics/react` to record each reveal event. Include the surface (`tabs` or `accordion`) and panel identifier (e.g. `analytics`, `visualization`) so product can correlate interaction rates with performance metrics.
- Fire an `initial: true` event for the default tab to preserve baseline usage metrics.
- When adding new expensive panels, update the tracking payload to include extra context (e.g. property id, feature flag) if available.

## Authoring checklist

1. Create the heavy panel as its own client component to isolate the split chunk.
2. Export a progressive wrapper (tabs + accordion) that:
   - keeps state of visited panels,
   - calls `track` on every reveal,
   - and renders a graceful loading skeleton until the dynamic import resolves.
3. Document the new panel in this file with rationale and any edge-case handling.
4. Verify that `pnpm lint` (and any relevant tests) continue to pass before opening a PR.
