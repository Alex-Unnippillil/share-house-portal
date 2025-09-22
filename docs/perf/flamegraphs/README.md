# Performance Flamegraphs

This directory stores timestamped flamegraph runs generated from the server-side CPU profiler.
Each run is created by [`scripts/profile-server.mjs`](../../../scripts/profile-server.mjs), which
wraps `next start` in `node --prof`, replays a target route, and converts the resulting V8 log
with [`0x`](https://github.com/davidmarkclements/0x).

## Generating a flamegraph

1. Build the app (`npm run build`) so the production server is ready.
2. Run the profiler against the route you want to inspect. For example, to profile the dashboard:

   ```bash
   node scripts/profile-server.mjs /dashboard
   ```

   Additional flags:

   - `--port <number>` to profile a non-default port.
   - `--label <name>` to override the folder name slug.
   - `--output-dir <path>` to send output somewhere other than `docs/perf/flamegraphs`.

3. After the script finishes you will see a folder named `<timestamp>-<route>` containing:

   - `flamegraph.html` – interactive visualization opened in a browser.
   - The raw `isolate-*.log` captured from `node --prof` for deeper debugging.

## Reading the visualization

Open `flamegraph.html` in a browser. The chart is rendered bottom-up:

- The bottom row represents entry points (for example, the HTTP handler for the profiled route).
- Each bar’s width is proportional to the amount of CPU time spent in that stack frame and all
  of its children.
- Taller stacks indicate deeper call trees. Look for wide, flat stacks near the top to find expensive
  functions.
- Hover over a frame to see the function name, total time, and self time. Use the search box in the
  top-right corner to highlight matching frames.

Because the profiler replays a single route, most noise from unrelated work is filtered out. If you
need to capture a longer interaction, increase the `--wait` duration so background tasks can flush
before shutdown.

## React client traces

`npm run profile:react` builds the application with React profiling instrumentation and extracts
trace events for the dashboard route into `docs/perf/traces/`. Those JSON files can be imported into
Chrome DevTools or the React Profiler to inspect client-side render timings.
