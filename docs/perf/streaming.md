# Streaming Dashboard Performance

## Test methodology

- Feature flag `NEXT_PUBLIC_FEATURE_STREAMING_DASHBOARDS` enabled to exercise the new streaming dashboard experience.
- Locally started the Next.js dev server via `pnpm dev`.
- Issued `curl http://localhost:3000/perf/streaming-test` to invoke the synthetic dashboard workload. The route replays the four dashboard data fetches sequentially and in parallel to highlight the impact of Suspense-enabled streaming.

## Results

| Scenario    | Duration (ms) |
| ----------- | ------------- |
| Sequential  | 871.62        |
| Parallel    | 320.54        |
| Improvement | 551.08        |

The Suspense-backed streaming path returns the main dashboard payload ~551 ms faster than the prior sequential rendering.

## Next steps

- Roll the feature out gradually by defaulting the flag off in production until load testing is complete.
- Capture field telemetry by logging route timings to the analytics pipeline once deployed.
- Extend the perf route to exercise member and todo segments as they gain asynchronous data sources.
