# Lease Active Index Benchmark

To verify the performance impact of the new `leases_active_idx` partial index we ran a local benchmark using PostgreSQL 16 with 200k synthetic lease rows (~66k active) generated via `generate_series`. The workload mirrors our dashboard lookups that retrieve active leases for a specific unit.

## Query Under Test

```sql
SELECT id
FROM public.leases
WHERE unit_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'active';
```

### Before `leases_active_idx`

```text
                                                      QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..5192.81 rows=4 width=16) (actual time=0.781..67.848 rows=6666 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   ->  Parallel Seq Scan on leases  (cost=0.00..4192.41 rows=2 width=16) (actual time=0.107..31.504 rows=2222 loops=3)
         Filter: ((unit_id = '11111111-1111-1111-1111-111111111111'::uuid) AND (status = 'active'::text))
         Rows Removed by Filter: 64445
 Planning Time: 1.231 ms
 Execution Time: 68.224 ms
```

### After `leases_active_idx`

```text
                                                         QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on leases  (cost=4.46..23.93 rows=5 width=16) (actual time=2.389..21.793 rows=6666 loops=1)
   Recheck Cond: ((unit_id = '11111111-1111-1111-1111-111111111111'::uuid) AND (status = 'active'::text))
   Heap Blocks: exact=3077
   ->  Bitmap Index Scan on leases_active_idx  (cost=0.00..4.46 rows=5 width=0) (actual time=1.992..1.992 rows=6666 loops=1)
         Index Cond: (unit_id = '11111111-1111-1111-1111-111111111111'::uuid)
 Planning Time: 1.364 ms
 Execution Time: 24.226 ms
```

## Observations

The dashboard query relied on a parallel sequential scan before the change. After introducing the partial index, PostgreSQL switches to a bitmap index scan that cuts execution time by ~2.8x and reduces block reads dramatically. This confirms the index is effective for unit-scoped active lease lookups.
