# Dashboard page structure

## Goals
- Split the `/dashboard` surface into smaller route groups so the overview screen is not bundled with analytics or activity panels.
- Gate optional widgets behind user actions and load them with `next/dynamic` to avoid unnecessary JavaScript on initial render.
- Limit prefetching to the core dashboard views while keeping supporting sections on demand.

## Route groups
- The dashboard now contains three top-level route groups: `(overview)`, `(analytics)`, and `(activity)`.
- `/dashboard` resolves to `app/dashboard/(overview)/page.tsx` with lighter summary cards and shortcuts.
- `/dashboard/analytics` and `/dashboard/activity` host heavier, management-oriented panels. Because they live in isolated groups, Next.js ships their bundles only when navigating into those sections.
- All routes continue to share `app/dashboard/layout.tsx`, which injects the persistent sidebar and a new segment navigator.

## Optional widgets
- `OptionalWidgetLauncher` is a client component that toggles a sustainability simulator using `next/dynamic` with `{ ssr: false }`.
- The simulator (`SustainabilityWidget`) only mounts when the user requests it, eliminating idle third-party chart logic from the default render path.
- A loading state inside the dynamic import keeps the interaction responsive while the widget downloads.

## Navigation prefetching
- `DashboardNav` renders primary dashboard segments (overview, analytics, activity). Only the overview link is prefetched, allowing the heavy analytics and activity bundles to stay deferred until clicked.
- Secondary navigation links inside `NavLinks` explicitly disable prefetching so they no longer compete with the dashboard bundles on slower connections.

## Future considerations
- Monitor bundle sizes with `next build --analyze` to validate the split delivers the expected savings.
- If analytics panels grow further, consider nested route groups (for example `(analytics)/(reports)`) to lazily fetch granular report builders.
- Evaluate moving long lists (messages, maintenance tickets) behind paginated data requests so initial paint remains quick.
