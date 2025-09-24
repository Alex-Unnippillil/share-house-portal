# Single-flight Load Test

## Scenario
- Simulated a burst of 200 concurrent calls into the shared `singleFlight` helper using the dedicated Vitest load harness.
- Each invocation awaited the same async worker that resolves after a short delay, mirroring how API routes now coalesce identical Supabase and fetch operations.

## Execution
```bash
RUN_LOAD_TEST=1 pnpm vitest run tests/load/single-flight.load.test.ts
```

## Results
- All 200 callers resolved successfully with the same payload while the underlying worker executed exactly once.
- The entire burst completed in roughly 11 ms on the local container, confirming minimal coordination overhead.

Console excerpt:
```
singleFlight load test: 200 concurrent calls => 1 execution in 10.76ms
```

## Next steps
- Integrate the helper with any future high-traffic loaders (e.g. analytics rollups) so coalescing happens consistently.
- Expand scenarios (varying keys, larger concurrency) if production telemetry indicates new hot spots.
