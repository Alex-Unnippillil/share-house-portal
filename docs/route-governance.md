# Route Governance

This document is the production route contract for the Share House Portal.

## Allowed production routes

### Core product routes

| Route | Access | Notes |
| --- | --- | --- |
| `/` | Public | Essentials-only entry with login/onboarding CTA. |
| `/auth` and `/auth/*` | Public | Authentication surfaces and callbacks. |
| `/onboarding` | Public | Guided tenant onboarding. |
| `/confirmation` | Public | Auth/email confirmation state. |
| `/signout` | Public | Session sign-out handoff page. |
| `/privacy` | Public | Required legal page. |
| `/terms` | Public | Required legal page. |
| `/dashboard` and `/dashboard/*` | Authenticated | Tenant and property-manager dashboard surfaces. |
| `/payments` | Authenticated | Rent and reconciliation workspace. |
| `/documents` | Authenticated | Lease/document workflows. |
| `/bookings` | Authenticated | Amenity reservations. |
| `/messaging` | Authenticated | Realtime roommate message board. |
| `/maintenance` | Authenticated | Maintenance requests and status tracking. |
| `/visitors` | Authenticated | Overnight visitor booking/log flow. |
| `/schedule` | Authenticated | Shared scheduling flow. |
| `/chores` | Authenticated | Roommate chores workflow. |
| `/supplies` | Authenticated | Shared supplies tracking. |
| `/account` | Authenticated | Tenant profile/account settings. |

### Internal tooling routes (flag-gated)

These routes are blocked in production unless `ENABLE_INTERNAL_ROUTES=true`.

- `/design-system`
- `/auth-server-action`
- `/about`
- `/contact`
- `/private`
- `/error`

### Demo/experimental routes (must not ship)

These routes are intentionally disallowed and should remain deleted:

- `/mdx`
- `/dashboard/todo`
- `/countries`
- `/ssrcountries`

## Public route audit classification

| Route | Classification |
| --- | --- |
| `/` | Core product |
| `/auth` | Core product |
| `/onboarding` | Core product |
| `/confirmation` | Core product |
| `/signout` | Core product |
| `/privacy` | Core product |
| `/terms` | Core product |
| `/dashboard` | Core product |
| `/dashboard/members` | Core product |
| `/dashboard/operations` | Core product |
| `/dashboard/operations/bookings` | Core product |
| `/dashboard/operations/finance` | Core product |
| `/dashboard/operations/maintenance` | Core product |
| `/dashboard/operations/moderation` | Core product |
| `/dashboard/operations/search` | Core product |
| `/payments` | Core product |
| `/documents` | Core product |
| `/bookings` | Core product |
| `/messaging` | Core product |
| `/maintenance` | Core product |
| `/visitors` | Core product |
| `/schedule` | Core product |
| `/chores` | Core product |
| `/supplies` | Core product |
| `/account` | Core product |
| `/design-system` | Internal tooling |
| `/auth-server-action` | Internal tooling |
| `/about` | Internal tooling |
| `/contact` | Internal tooling |
| `/private` | Internal tooling |
| `/error` | Internal tooling |

## CI enforcement

`pnpm route:check` (`scripts/check-route-governance.mjs`) scans all App Router page routes and fails when:

1. An unclassified route is introduced.
2. A demo/experimental route reappears.

This check is wired into `.github/workflows/ci.yml`.
