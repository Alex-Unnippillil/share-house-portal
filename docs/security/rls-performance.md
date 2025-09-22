# RLS Policy Performance Validation

This document tracks the RLS policy tuning performed to keep Supabase (Postgres) row level security checks aligned with indexed columns so the planner can continue to use bitmap or index scans even when RLS is enforced.

## Summary of Changes

- Added a defensive `idx_profiles_unit_id` index to guarantee unit lookups from policies remain index assisted.
- Replaced broad OR-based predicates with narrowly scoped policies on `documents`, `document_signatures`, `document_access_logs`, `leases`, `maintenance_requests`, and `visitor_logs` so every tenant-facing predicate resolves to an `auth.uid()` equality check on `tenant_id`, `unit_id`, or other indexed foreign keys.
- Preserved property manager/admin access policies to avoid regressions while tightening tenant-scoped filters.

Refer to `supabase/migrations/202502140001_rls_policy_index_tuning.sql` for the full SQL definition.

## Deployment Checklist

1. **Create a new migration** – already committed in this repository.
2. **Deploy to staging** using the Supabase CLI:
   ```bash
   supabase db push --env staging
   ```
3. **Invalidate any cached PostgREST plans** so the new policies are respected immediately:
   ```sql
   SELECT pg_notify('pgrst', 'reload config');
   ```

## Verifying Index Usage Under RLS

Run the checks below in staging (or any environment mirroring production data). The examples assume you are connected with the Supabase service key so you can impersonate tenant sessions. Replace UUIDs with real IDs from your dataset.

```sql
-- Impersonate a tenant before running EXPLAIN so RLS predicates execute
SET SESSION AUTHORIZATION '11111111-2222-3333-4444-555555555501';

-- Documents: expect idx_documents_tenant_id or idx_documents_unit_id to appear
EXPLAIN
SELECT id, title FROM public.documents
WHERE tenant_id = auth.uid();

-- Document signatures: signer_id index should be used
EXPLAIN
SELECT id FROM public.document_signatures
WHERE signer_id = auth.uid();

-- Maintenance requests: planner should choose idx_maintenance_requests_unit_id
EXPLAIN
SELECT id, title FROM public.maintenance_requests
WHERE unit_id IN (
  SELECT unit_id FROM public.profiles WHERE id = auth.uid()
);

RESET SESSION AUTHORIZATION;
```

For deeper validation, rerun the queries with `EXPLAIN (ANALYZE, BUFFERS)` while the session authorization remains set to the tenant. Confirm the output shows an `Index Scan` or `Bitmap Heap Scan` on the expected index rather than a sequential scan.

## Troubleshooting

- If `EXPLAIN` indicates a sequential scan, verify statistics are up to date (`ANALYZE public.<table>`), and ensure the tenant rows populate the indexed columns (`tenant_id`, `unit_id`).
- When backfilling new `unit_id` values, temporarily disable the affected policies or execute the backfill with the service role to bypass RLS.
- Keep `supabase db diff` snapshots for production parity before promoting the migration.
