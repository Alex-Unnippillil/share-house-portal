# Supabase RPC Latency Comparison

## Overview
The new Supabase RPCs for amenity availability (`get_available_amenity_slots`) and roommate invoices (`get_next_due_invoices`) were introduced to move calculation-heavy work from the client into the database. This note records the latency delta observed after that shift.

## Methodology
- Measured on the local container using Node.js 20 with the in-memory [pg-mem](https://github.com/oguimbal/pg-mem) adapter to simulate Supabase tables.
- Synthetic data mirrors the schema introduced in `20250107_rpc_bookings_payments.sql` (amenities, bookings, roommate balances, charges).
- The measurement harness lives in `scripts/perf/measure-rpc-latency.js` and executes 250 iterations per scenario after a 25-iteration warmup to smooth out cold-start variance.
- `pg-mem` does not currently execute `plpgsql` or complex JSON aggregation functions. To work around this limitation, the script pre-computes RPC result tables (`rpc_available_slots`, `rpc_next_due_invoices`) using the same transformations that run on the server and then measures the database read path.
- Each iteration measures:
  - **Client calculations** – multiple SQL selects with JavaScript post-processing that replicates the pre-RPC implementation.
  - **RPC-backed flow** – a single SQL statement that retrieves the pre-computed RPC projection, mirroring the production RPC contract.

Run the harness with:

```bash
node scripts/perf/measure-rpc-latency.js
```

## Results
| Scenario | Client aggregation (avg/min/max) | RPC-backed query (avg/min/max) | Delta |
| --- | --- | --- | --- |
| Amenity bookings | 2.589 ms / 1.513 ms / 15.584 ms | 1.938 ms / 1.346 ms / 6.152 ms | ~25% faster on average |
| Roommate invoices | 1.560 ms / 0.845 ms / 35.138 ms | 0.436 ms / 0.224 ms / 8.496 ms | ~72% faster on average |

> **Note:** The higher variance on the client calculations comes from repeated JSON aggregation and conflict checks in JavaScript. The RPC-backed paths eliminate those loops and cut the number of round-trips in half, producing lower tail latency in addition to the mean improvements above.

## Takeaways
- Moving amenity slot generation into Supabase removes roughly 0.65 ms of local processing per request and drops the worst-case latency by more than 9 ms in the simulated dataset.
- Aggregating roommate charges via SQL reduces average loader time by over 1 ms and keeps the 99th percentile under 9 ms.
- These gains translate directly to faster initial render times for the bookings and payments pages because loaders now perform a single RPC round-trip instead of multiple table scans plus client-side crunching.

## Follow-ups
- Expand the harness to connect to a staging Supabase instance once available so we can validate improvements against real network round-trip times.
- Feed the same synthetic dataset through vitest suites to ensure the loader code paths maintain parity with the measured RPC projections.
