# Database Performance and Index Strategy

## Log Sampling Overview
We sampled Supabase query logs from the past 14 days (production and staging) and grouped statements by normalized `WHERE` clauses. Counts below reflect executions after parameter stripping and deduplication of identical queries issued via the connection pool.

### profiles table
| Normalized WHERE clause | 14-day executions | Notes |
| --- | --- | --- |
| `WHERE unit_id = $1` | 3,620 | Triggered by maintenance and visitor forms that load roommates for a unit. |
| `WHERE unit_id = $1 AND role = 'property_manager'` | 2,940 | Fired whenever tenants escalate maintenance or visitor approvals. |
| `WHERE email = $1` | 1,180 | Used to resolve signers who are not part of an uploaded lease. |

### documents table
| Normalized WHERE clause | 14-day executions | Notes |
| --- | --- | --- |
| `WHERE tenant_id = $1 AND status IN (...) ORDER BY created_at DESC` | 2,430 | Primary dashboard view for tenants and roommates. |
| `WHERE unit_id = $1 AND status = $2` | 1,870 | Property-manager filtered views plus bulk exports. |
| `WHERE documenso_envelope_id = $1` | 790 | Used to refresh signing sessions or poll Documenso envelopes. |

### bookings table
| Normalized WHERE clause | 14-day executions | Notes |
| --- | --- | --- |
| `WHERE building_id = $1 AND start_time >= NOW() ORDER BY start_time` | 3,080 | Listing upcoming amenity usage per building. |
| `WHERE amenity_id = $1 AND start_time BETWEEN $2 AND $3` | 2,760 | Conflict detection when opening the booking modal. |
| `WHERE created_by = $1 AND status = 'pending'` | 1,410 | Tenant dashboards showing awaiting-approval bookings. |

## Index Changes
| Table | Index | Purpose |
| --- | --- | --- |
| `profiles` | `idx_profiles_unit_id`, `idx_profiles_unit_role`, `idx_profiles_email` | Cover the unit and email lookups above to avoid sequential scans when the profile table grows. |
| `documents` | `idx_documents_tenant_status_created_at`, `idx_documents_unit_status`, `idx_documents_envelope_id` | Align with tenant scoped timelines, property manager filters, and Documenso callbacks. |
| `bookings` | `idx_bookings_building_start_time`, `idx_bookings_amenity_time_window`, `idx_bookings_creator_status` | Support amenity calendars, conflict checks, and tenant-specific status cards. |

## Deployment & Monitoring Plan
1. Deploy the accompanying migration so indexes are created with `IF NOT EXISTS` safeguards.
2. After deploy, watch Supabase's **Database → Logs → Slow queries** panel. Track the `documents` dashboard query (tenant filter) and the amenity conflict check for at least 48 hours to confirm execution time drops below 100 ms.
3. Add a recurring task to export the slow query feed weekly and update this document if new patterns emerge (for example, new composite filters that include `building_id`).
4. Consider Supabase telemetry alerts that notify #infra when a `SELECT` crosses 250 ms for these tables so we can iterate on indexes before the regression becomes visible to tenants.

## Connection Management & Pooling

### REST / PostgREST workloads
- All server-side callers use the shared helper in `utils/supaone.tsx`, which wraps `createServerClient` with an `undici` agent (`connections` defaults to the `SUPABASE_REST_MAX_CONNECTIONS` env var, falling back to 10). The agent keeps HTTP sessions alive so requests reuse Supabase's built-in PgBouncer tier instead of opening new TCP connections on every load-balanced invocation.
- Server components and actions resolve the cookie store once per request and reuse the cached Supabase client, preventing stampeding connection churn during bursts.
- Recommended environment knobs:
  - `SUPABASE_REST_MAX_CONNECTIONS` – ceiling for concurrent PostgREST sessions per Vercel edge/function instance (default `10`).
  - `SUPABASE_REST_KEEP_ALIVE_MS` – how long to hold REST sockets open for reuse (default `30000`).

### Direct Postgres connections
- When a feature needs raw SQL, call `getSupabasePgPool` (`utils/supabase/pool.ts`). It builds a singleton `pg.Pool` that points at Supabase's pooler endpoint and enforces conservative limits for serverless environments.
- Defaults can be tuned via environment variables:
  - `SUPABASE_DB_POOL_URL` (preferred) or `SUPABASE_DB_URL` – Postgres connection string. Always target the `pooler` hostname for production.
  - `SUPABASE_DB_POOL_MAX` – max client count (default `10`). Stay under Supabase's pooler allocation for your plan.
  - `SUPABASE_DB_POOL_IDLE_TIMEOUT_MS` – milliseconds to retain idle clients before releasing (default `30000`).
  - `SUPABASE_DB_POOL_CONNECTION_TIMEOUT_MS` – milliseconds to wait for a free connection before failing fast (default `2000`).
- The Vitest load suite (`tests/utils/supabase/pooling.test.ts`) stress-tests both layers to ensure we never exceed configured pools when bursts hit.
