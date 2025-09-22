# Data Fetching Performance Playbook

Server components should own data loading so that client bundles stay light and hydration work is minimal. These are the guardrails we follow when wiring new features:

## Prefer server loaders/actions

- Fetch data with route-level loaders (`app/**/loaders.ts`) or server actions so React can stream HTML with the requested state baked in.
- Pass the resulting data into client components via props instead of letting them issue their own queries.
- Reuse the same loader inside related server actions (for example, `submitCatchUpPayment`) to avoid diverging data sources.

## Keep client effects for secondary work

- Avoid `useEffect` for bootstrapping primary data; it delays first paint and duplicates fetches.
- Reserve effects for event subscriptions, realtime listeners, and other progressive enhancements.
- When client state depends on server data, seed it from props (or reset via transitions) rather than re-fetching inside the component.

## Co-locate derived computations on the server

- Perform expensive aggregations (totals, summaries, counts) alongside the loader so only lightweight props cross the server/client boundary.
- Memoize or cache loader results if multiple components reuse the same dataset within a request.
- Keep loaders deterministic—accept any inputs explicitly and avoid reading from global mutable state.

## Test with server boundaries in mind

- Write unit tests that call loaders/actions directly to verify the shape of SSR data.
- Mock downstream services at the loader/action level rather than inside client components.
- Ensure tests assert both the returned data and any guardrails (e.g., authorization fallbacks) before rendering client UI.
