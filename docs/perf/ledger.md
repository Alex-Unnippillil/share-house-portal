# Ledger query denormalization

## Overview
- Added denormalized columns on `rent_payments` so ledger UIs can read payer and unit labels directly.
- Populated the new columns via a trigger that looks at profile data, unit metadata, and Stripe payload metadata.
- Built a covering index on `(unit_id, processed_at DESC)` so filtering by unit and ordering by `processed_at` uses a single index scan.

## Schema updates
- Added `payer_name`, `unit`, and a persisted `unit_id` column with backfill logic driven by a refreshed trigger function `set_rent_payments_denorm_fields`.
- The trigger resolves payer information with the following priority:
  1. Existing denormalized values (if already present).
  2. Stripe metadata keys (`payer_name`, `tenant_name`, `customer_name` for names; `unit_label`, `unit`, `unit_number` for units).
  3. Related profile rows for the tenant, falling back to any available `unit_id`.
  4. Optionally resolves a friendly label from `public.units` if the table and a descriptive column (`label`, `name`, `unit_label`, `unit_number`, or `code`) exist.
- Backfill is performed in-place with the `update_rent_payments_updated_at` trigger temporarily disabled so historical timestamps remain intact.
- Created a conditional covering index `idx_rent_payments_unit_processed_at` when both `unit_id` and `processed_at` columns are present.

## Query plan verification
Using a local PostgreSQL 16 instance with ~600 historical payments for `Unit 3B`, the ledger query leverages the refreshed covering index without auxiliary joins:

```sql
EXPLAIN ANALYZE
SELECT
  id,
  payer_name,
  unit,
  amount,
  processed_at
FROM public.rent_payments
WHERE unit_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY processed_at DESC
LIMIT 10;
```

Plan excerpt:

```
Limit  (cost=0.28..1.63 rows=10 width=80) (actual time=0.120..0.127 rows=10 loops=1)
  ->  Index Scan using idx_rent_payments_unit_processed_at on rent_payments  (cost=0.28..81.65 rows=600 width=80) (actual time=0.119..0.124 rows=10 loops=1)
        Index Cond: (unit_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)
```

Re-running `EXPLAIN ANALYZE` after adding the physical `unit_id` column confirmed the planner keeps using the `idx_rent_payments_unit_processed_at` covering index for this workload.

## Follow-up notes
- Additional metadata keys can be added to the trigger if future Stripe payloads carry richer context.
- If new descriptive columns are introduced on `public.units`, they should be added to the lookup priority list inside the trigger function.
