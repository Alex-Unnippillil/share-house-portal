# Row Level Security Reference

This document captures the authoritative list of row level security (RLS) rules
that guard the Share House multi-tenant data model. All tenant-scoped tables are
protected by the same set of baseline policies to ensure that residents can only
interact with data from households they belong to while household admins retain
full management control.

## Helper Functions

The migration `20250601_household_rls.sql` defines helper functions that power
all policies:

- `public.is_service_role()` — allows Supabase service role tokens to bypass RLS
  checks for server-initiated automation.
- `public.is_household_member(household_id uuid)` — returns `TRUE` when the
  current authenticated user has an active membership within the referenced
  household.
- `public.is_household_admin(household_id uuid)` — returns `TRUE` for active
  household members whose role is `admin` or `property_manager` (and for service
  role tokens).

Every policy listed below relies on these helpers so that membership checks stay
consistent across tables.

## Policy Matrix

| Table | Policies | Effect |
| --- | --- | --- |
| `public.households` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members can read household metadata; admins (or service role) can create/update/delete households. |
| `public.household_members` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members can view the roster for their household; only admins may add or remove members. |
| `public.leases` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members can review lease records tied to their household and update shared metadata (e.g., notes). Admins manage lifecycle operations. |
| `public.rent_payments` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members may view payment history and update status fields they own (for example, marking a manual payment). Admins can create, reconcile, and delete payment rows. |
| `public.amenity_bookings` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members can see or reschedule their own bookings; admins can create or cancel bookings on behalf of the household. |
| `public.maintenance_requests` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members submit and update request details; admins or staff accounts handle assignments and closures. |
| `public.visitor_logs` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members track their guest entries while admins retain authority over record corrections. |
| `public.household_documents` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members view and annotate shared files; admins control upload and archival. |
| `public.household_threads` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members can browse or update thread metadata (e.g., renaming); admins can open or archive threads. |
| `public.household_messages` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members exchange messages inside their household threads; admins can moderate by removing posts when necessary. |
| `public.floorplans` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members access annotated floorplans; admins manage uploads and removals. |
| `public.floorplan_annotations` | `household_member_access`, `household_admin_manage`, `household_admin_write_guard`, `household_admin_delete_guard` | Members collaborate on annotation overlays; admins retain deletion authority. |

### Policy Semantics

- `household_member_access` (`PERMISSIVE`, `FOR ALL`): Ensures the actor is an
  active household member before any read or write. The policy enables resident
  self-service updates without granting them unrestricted creation/deletion
  rights.
- `household_admin_manage` (`PERMISSIVE`, `FOR ALL`): Grants full CRUD capability
  to household admins and property managers, including service-role automation.
- `household_admin_write_guard` (`RESTRICTIVE`, `FOR INSERT`): Blocks inserts
  unless the actor also satisfies `household_admin_manage`, effectively limiting
  record creation to admins or service roles.
- `household_admin_delete_guard` (`RESTRICTIVE`, `FOR DELETE`): Prevents row
  deletion by non-admin members while still requiring membership via
  `household_member_access`.

All tables listed above have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` applied
so that policies are enforced by default via Supabase APIs.
