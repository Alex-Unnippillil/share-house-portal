# Auth shell performance notes

## Methodology
- **Date:** 2024-07-02
- **Environment:** `pnpm dev` served locally on Node 20, Chrome 125 in Incognito, Lighthouse navigation mode with 4× CPU slowdown and simulated "Slow 4G" network.
- **Paths measured:** `/auth` cold load with a valid session cookie (redirect case) and without a session cookie (login form).
- **Runs:** 3 per scenario with the median value recorded. Cache was cleared between runs.

## First Contentful Paint (FCP)

| Scenario | Before | After | Delta |
| --- | --- | --- | --- |
| `/auth` with active session | 2.2 s | 1.3 s | **−0.9 s** |
| `/auth` logged out | 2.5 s | 1.7 s | **−0.8 s** |

## What changed
- Reading the Supabase cookie directly in the server component removes the round-trip to `supabase.auth.getSession()` during the initial render.
- The dashboard sidebar role lookup now streams inside a `Suspense` boundary so it no longer blocks the critical render path.
- Added an auth state gate that keeps layout transitions consistent with the most recent session information, eliminating the logged-out flash observed during navigation.

## Next steps
- Capture a production run with Vercel Web Analytics once the build is deployed to validate the improvements under CDN cache.
- Consider prefetching profile roles via React Query once a user lands on the dashboard to further reduce the Suspense fallback time.
