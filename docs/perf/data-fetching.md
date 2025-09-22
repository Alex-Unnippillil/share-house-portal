# Data Fetching Utilities

Roomsily consolidates common Supabase queries into shared helpers to minimize network chatter and keep client components lean. Use these modules whenever you need document or member data so filters and role-based scoping stay consistent across the app.

## `lib/data/documents.ts`

### `fetchDocumentsList`
- **Purpose:** Returns the document list with leases, signatures, and access logs joined in a single round trip.
- **Role-aware:** Automatically limits tenants/roommates to documents they own or must sign while allowing property managers and admins to view everything.
- **Filters:** Supports status, type, tenant, unit, and created-at range filters.
- **Usage:** Pass a Supabase client along with the requesting user id, their role (or `null`), and optional filters. The helper throws on Supabase errors so wrap calls in `try/catch` inside server actions or client hooks.

### `fetchDocumentStats`
- **Purpose:** Computes document counts (total, signed, pending signatures, expired, drafts).
- **Role-aware:** Applies the same tenant scoping rules as the list helper before aggregating.
- **Usage:** Provide the Supabase client, user id, and role. Handle thrown errors to surface friendly feedback.

## `lib/data/members.ts`

### `fetchMemberRole`
- **Purpose:** Looks up a profile’s role from the `profiles` table and normalizes the result to `MemberRole | null`.
- **Usage:** Ideal for navigation guards and permission hooks. Wrap in `try/catch` if you want to recover gracefully when the profile is missing.

### `fetchMemberProfile`
- **Purpose:** Fetches a condensed profile record (`id`, `email`, `full_name`, `role`, `unit_id`).
- **Usage:** Use in forms and actions that need the current member’s unit/identity without repeating column lists.

### `fetchMembersByUnit`
- **Purpose:** Returns members attached to a unit with optional filters for roles and users to exclude.
- **Usage:** Power roommate/property manager lookups for maintenance requests, visitor bookings, or any dashboard member table. Errors bubble as exceptions so caller code can present a single “failed to load members” message.

## Testing Strategy

Vitest unit tests (`tests/lib/data/*.test.ts`) mock the Supabase client chain to confirm that each helper:
- Calls the expected tables/filters.
- Applies tenant scoping correctly.
- Throws when Supabase returns an error.

Run `pnpm test` after modifying these utilities to ensure behavior stays locked in.

