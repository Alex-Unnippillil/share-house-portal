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
