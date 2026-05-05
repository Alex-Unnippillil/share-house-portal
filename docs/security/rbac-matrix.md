# RBAC Matrix

This matrix maps route-level access (middleware) and table-level actions (Supabase RLS) for each role.

## Roles

- `tenant`
- `roommate`
- `property_manager` (scoped to assigned units via `manager_unit_assignments`)
- `admin` (global override)

## Route Access (Next.js middleware)

| Route prefix | tenant | roommate | property_manager | admin | Notes |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | Authenticated shell routes. |
| `/dashboard/members` | ❌ | ❌ | ✅ | ✅ | Manager/admin staff workflow only. |
| `/payments` | ✅ | ✅ | ✅ | ✅ | Users see scoped payment records via RLS. |
| `/documents` | ✅ | ✅ | ✅ | ✅ | Users see scoped documents via RLS. |
| `/bookings` | ✅ | ✅ | ✅ | ✅ | Amenity bookings + reservations. |
| `/messaging` | ✅ | ✅ | ✅ | ✅ | Message board route guard; table enforcement depends on future message tables. |
| `/maintenance` | ✅ | ✅ | ✅ | ✅ | Maintenance workflows scoped by unit assignment. |
| `/schedule` | ✅ | ✅ | ✅ | ✅ | Availability and amenity schedule. |
| `/account` | ✅ | ✅ | ✅ | ✅ | Own account context. |
| `/private` | ✅ | ✅ | ✅ | ✅ | Generic protected surface. |

## Table Access (Supabase RLS)

| Table | tenant | roommate | property_manager | admin |
| --- | --- | --- | --- | --- |
| `profiles` | Read own + same unit; update own profile | Read own + same unit; update own profile | Read/manage profiles in assigned units | Full override |
| `manager_unit_assignments` | No direct management | No direct management | Read own assignments | Full CRUD |
| `documents` | Read own/associated docs and same-unit docs; no manager updates | Same as tenant | Read/update docs in assigned units | Full override |
| `document_signatures` | Read own + signatures on accessible docs; update own signature | Same as tenant | Read signatures for assigned-unit docs | Full override |
| `document_access_logs` | Read own + logs for accessible docs | Same as tenant | Read logs for assigned-unit docs | Full override |
| `leases` | Read leases attached to accessible documents | Same as tenant | Read leases in assigned units | Full override |
| `rent_payments` | Read own payments and own unit-scope rows | Same as tenant | Read/update payments in assigned units | Full override |
| `subscriptions` | Read own subscriptions | Same as tenant | Read subscriptions for users in assigned units | Full override |
| `maintenance_requests` | Read own + same-unit requests; create own | Same as tenant | Read/update assigned-unit requests | Full override |
| `visitor_logs` | Read/create own host records + same-unit visibility | Same as tenant | Read/update visitor logs for assigned units | Full override |
| `bookings` | Read/create own bookings; same-unit visibility via `can_access_user(tenant_id)` | Same as tenant | Read/update/delete bookings for users in assigned units | Full override |
| `notifications` | Read/update own notifications | Same as tenant | Read notifications for users in assigned units | Full override |
| `email_notifications` | Read own email notification logs | Same as tenant | No default global read | Full override |

## Action Summary

- **Unit-scoped authorization** uses helper functions:
  - `current_user_role()`
  - `is_admin()`
  - `is_manager_for_unit(unit_id)`
  - `can_access_unit(unit_id)`
  - `can_access_user(user_id)`
- **Manager scope** is derived from `manager_unit_assignments`.
- **Admin override** is explicit via `is_admin()` checks in privileged policies.

## Verification Script

Use `supabase/tests/rls_rbac_verification.sql` to validate positive/negative RLS paths, including cross-unit read denial and admin override behavior.

## API Export Guard Pattern

- All operations export endpoints under `app/api/exports/*` must call `requirePrivilegedApiAccess()` from `lib/authz.ts` at the start of the request.
- `requirePrivilegedApiAccess()` centralizes authentication and privileged-role authorization and returns either:
  - `{ user, role, supabase }` for authorized `property_manager` and `admin` actors, or
  - `{ response }` with standardized JSON payload/status (`401 Unauthorized` or `403 Forbidden`).
- Guard usage pattern:
  1. `const auth = await requirePrivilegedApiAccess()`
  2. `if ('response' in auth) return auth.response`
  3. continue route logic with `auth.user.id` and `auth.role` for audit attribution.

This ensures consistent privileged export controls and avoids duplicated authz logic across export routes.
