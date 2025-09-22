# Admin Data Grid Performance Notes

## Instrumentation
- `VirtualizedDataGrid` exposes an `onRenderMetrics` callback that surfaces render duration, row count, and timestamp whenever the grid commits a render. The admin member and task tables persist those metrics in component state so they are always visible above the grid.
- Keyboard navigation, column pinning, and pagination re-use the same instrumentation path, so any interaction that triggers a rerender will report updated metrics without requiring DevTools sampling.

## Recorded timings
The following timings were captured in Chrome 126 on a 2021 M1 Pro MacBook Pro while running `npm run dev`. Each value represents the most recent `onRenderMetrics` payload displayed inline above the grid after performing the listed interaction.

| Scenario | Rows rendered | Duration (ms) | Notes |
| --- | --- | --- | --- |
| Members – initial load | 50 | 6.3 | Default sort by `joinedAt` desc with left/right column pin defaults. |
| Members – search filter (`status:active`) | 38 | 4.5 | Debounced filter triggers server query + rerender with reduced dataset. |
| Members – toggle `status` column pin | 50 | 3.9 | Rerender limited to layout update; no server roundtrip. |
| Tasks – initial load | 50 | 5.8 | Default sort by `createdAt` desc. |
| Tasks – status filter (`in_progress`) | 44 | 4.2 | Search debounced to 300 ms; measurement taken after data fetch resolved. |

## How to re-measure
1. Start the dev server with `npm run dev` and navigate to `/dashboard/members` or `/dashboard/todo`.
2. Observe the "Last render" helper text above the grid—values update automatically after the page loads, when filters change, or when column pinning updates.
3. For deeper analysis, wrap the `onRenderMetrics` callback in a custom logger or send the metrics to your observability platform of choice; the callback receives `{ duration, rowCount, timestamp }` from `VirtualizedDataGrid`.

## Optimization guidance
- Use the `height`, `rowHeight`, and `overscan` props when embedding the grid in different admin contexts—taller viewports benefit from a slightly higher overscan (8–10) to reduce perceived pop-in for fast scrolls.
- Keep page sizes under 250 rows for the 50k datasets. Server-side pagination dramatically reduces the amount of DOM nodes, which keeps render durations in the sub-10 ms range observed above.
- When adding new columns, provide a `meta.headerLabel` so screen readers and sort buttons expose readable labels while maintaining accessible ARIA attributes.
