# Tenant Onboarding via Invite Redemption

This document explains how the invite redemption flow works in the Roomsily tenant portal. The new workflow preloads invite context on the server so the client form can hydrate instantly, and it instruments the route to keep time-to-interactive (TTI) under 200 ms.

## Route overview

- **Path:** `/onboarding/redeem/[token]`
- **Purpose:** Allow an invited roommate to confirm their contact details, acknowledge household policies, and activate access to their assigned unit.
- **Server data loader:** `app/onboarding/redeem/[token]/loader.ts` queries Supabase for the invite, unit, and property records. When Supabase credentials are not present (e.g., during local demos) the loader falls back to deterministic seed data so the experience still renders without client-side fetches.
- **Prefetched context:** The loader produces a serialisable `InvitePrefetchContext` object. The page passes this into `InviteContextProvider` so all client components (form, property overview, perf instrumentation) can read the same data without issuing duplicate network calls or waiting for suspense fallbacks.

## Client components

- **`InviteRedemptionForm`:** Renders the acceptance form with the invitee's email, recommended rent share, and move-in notes pre-populated from the server context. Because the data is already hydrated, the form no longer shows intermediate spinners.
- **`InviteRouteMetrics`:** Runs on the client after hydration, measures the TTI using `performance.now()`, and sends the result to `/api/metrics` (falls back to `fetch` when `sendBeacon` is unavailable). Warnings are logged if the 200 ms threshold is exceeded so regressions are easy to spot during development.
- **`PropertyOverview`:** Displays the property address, unit characteristics, amenities, and any invite notes alongside the form to keep the roommate confident about what they are accepting.

## Metrics endpoint

`app/api/metrics/route.ts` accepts POST requests from the client instrumentation and writes structured logs to the server console. The handler validates payload shape before logging to avoid noisy output from malformed requests. Future iterations can forward these metrics to Vercel Analytics or another telemetry backend.

## Demo token

For local development without Supabase credentials, navigate to `/onboarding/redeem/demo-welcome-token`. The loader will serve the embedded Hudson Loft Residences fixture so designers and PMs can review the end-to-end flow without configuring the database.

## Updating the flow

1. Modify the `InvitePrefetchContext` type when new fields are needed across the form or property summary. Update the loader and context provider at the same time to keep the shape in sync.
2. Keep the server loader as the single source of truth. Any additional client component should consume the context via `useInviteContext` to prevent data fetching duplication.
3. If the acceptance flow starts writing to additional Supabase tables, extend `completeInviteRedemption` in `actions.ts` so updates happen in the same transaction that marks the invite as accepted.
4. When changing UI copy or validation rules, run `npm run lint` to ensure the TypeScript build and lint checks continue to pass.
