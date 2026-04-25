# Route-to-role policy (RBAC)

This table defines intent for protected route families enforced by `lib/auth-rbac.ts`.

| Route family | Tenant / Roommate | Property manager | Admin | Notes |
| --- | --- | --- | --- | --- |
| `/dashboard` | ✅ | ✅ | ✅ | Base dashboard and tenant-facing sections. |
| `/dashboard/operations` | ❌ | ✅ | ✅ | Property operations surfaces and management workflows. |
| `/payments` | ✅ | ✅ | ✅ | Rent, receipts, and payment status surfaces. |
| `/documents` | ✅ | ✅ | ✅ | Lease and signed-document access surfaces. |
| `/bookings` | ✅ | ✅ | ✅ | Amenity reservations and booking history. |
| `/maintenance` | ✅ | ✅ | ✅ | Maintenance request creation and status tracking. |
| `/visitors` | ✅ | ✅ | ✅ | Overnight visitor registration and review. |
| `/messaging` | ✅ | ✅ | ✅ | Realtime message board and moderation entry points. |
| `/api/exports` | ❌ | ❌ | ✅ | Administrative exports endpoint family. |

## Default deny for authenticated route prefixes

If a route is under `AUTHENTICATED_ROUTE_PREFIXES` and does not match a row in this table, access is denied by default until an explicit role rule is added.
