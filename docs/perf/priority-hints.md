# Priority Hints Validation

## Summary
- Added a high-priority fetch hint to the onboarding hero image so the primary visual loads with LCP priority.
- Prefetched the initial Supabase session request from the document head on the marketing route to reduce authentication latency without impacting secondary routes.

## Measurement Plan
- Run a WebPageTest "Performance" run against the production marketing URL (`/`) to capture updated LCP timings. Use the "Simple" configuration or the `/perf` API endpoint with the following script:
  ```text
  navigate https://{deployment-domain}/
  ```
- Record the resulting LCP value, filmstrip, and waterfall, comparing it with the previous baseline in this document.

## Local Verification Attempt
Because external WebPageTest runs are not possible inside this container, a Lighthouse collection was attempted as a proxy:

```bash
npx @lhci/cli collect --url=http://localhost:3000 \
  --numberOfRuns=1 \
  --settings.preset=desktop \
  --start-server-command="pnpm dev"
```

The run failed with `The CHROME_PATH environment variable must be set to a Chrome/Chromium executable`, which blocks gathering local LCP telemetry. Capture a Lighthouse JSON report or rerun the WebPageTest measurement from an environment with Chrome available to populate before/after figures here.

## Next Steps
- Re-run the WebPageTest `/perf` measurement once deployed and append the resulting LCP, render start, and request waterfall screenshots in this file.
- If Chrome is available locally, rerun the `lhci collect` command above to obtain a Lighthouse report for archival alongside the WebPageTest data.
