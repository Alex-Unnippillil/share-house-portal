# Amenity Booking Conflict Index Benchmark

## Summary
- Added a composite `(amenity_id, start_time, end_time)` index so range-based conflict checks hit a narrow btree path instead of scanning per amenity bucket.
- Updated the `find_conflicting_bookings` helper to express conflicts as `start_time < $end AND end_time > $start`, the pattern that maps to the composite index.
- Conflict lookups on a 100k row synthetic dataset now resolve in ~1.2 ms on average (max 2.52 ms), comfortably below the 10 ms SLA.

## Methodology
1. Generated 100k amenity bookings across ten amenities with uniform 30-minute slots.
2. Exercised the conflict probe query 25× before the index to capture the baseline.
3. Created the composite index and re-ran the probe 25× to record the optimized timings.
4. Captured metrics using the [`scripts/perf/bookings-conflict-benchmark.mjs`](../../scripts/perf/bookings-conflict-benchmark.mjs) harness.

The benchmark uses [`@electric-sql/pglite`](https://github.com/electric-sql/pglite) to run in-process PostgreSQL, matching the SQL semantics used in Supabase migrations.

## Results
| Scenario | Avg (ms) | P90 (ms) | Max (ms) |
| --- | --- | --- | --- |
| Before index | 7.031 | 12.758 | 12.937 |
| After composite index | 1.217 | 1.534 | 2.522 |

_Source: `npm run perf:bookings`_【8b63fa†L1-L6】

## Monitoring Notes
- `lib/booking-conflicts.ts` records the elapsed time for every conflict query and warns when it exceeds the 10 ms budget, making slow paths visible in logs.
- `POST /api/bookings/conflicts` returns the measured duration alongside conflict rows so dashboards can alert if callers observe spikes.

## Reproducing the Benchmark
```bash
npm install
npm run perf:bookings
```
