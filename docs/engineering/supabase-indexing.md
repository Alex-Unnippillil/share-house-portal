# Supabase Compound Index Coverage

This note tracks the multi-column indexes that support building-scoped queries across
household membership, chore coordination, and billing history.

## Index Summary

| Table | Index name | Column order | Use case |
| --- | --- | --- | --- |
| `member_households` | `idx_member_households_building_member` | `(building_id, member_id)` | Resolve the active households for a signed-in roommate without scanning other buildings. |
| `member_households` | `idx_member_households_building_household` | `(building_id, household_id)` | Enumerate household rosters within a building for staff dashboards. |
| `chore_assignments` | `idx_chore_assignments_building_assigned_status_due` | `(building_id, assigned_to, status, due_date DESC)` | Show outstanding chores for a roommate ordered by due date. |
| `chore_assignments` | `idx_chore_assignments_building_household_due` | `(building_id, household_id, due_date DESC)` | List upcoming chores for a unit during building walk-throughs. |
| `invoices` | `idx_invoices_building_tenant_status_due` | `(building_id, tenant_id, status, due_date DESC)` | Fetch a tenant's open balances in a building without a sequential scan. |
| `invoices` | `idx_invoices_building_household_due` | `(building_id, household_id, due_date DESC)` | Reconcile invoices per household during rent roll reviews. |

## Verifying Query Plans

Run the following checks on staging after deploying the migration:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.member_households
WHERE building_id = '00000000-0000-0000-0000-000000000000'
  AND member_id = '00000000-0000-0000-0000-000000000000';
```

The plan should report `Index Scan using idx_member_households_building_member`. Similar
checks for `chore_assignments` and `invoices` should highlight their respective indexes.
This ensures Supabase queries leverage the new indexes instead of default sequential scans.

## Test Coverage

`pnpm test -- supabase-indexes` reads the migration and asserts that the expected index
statements remain in place, providing lightweight protection against accidental removal.
