# Edge cache strategy

Roomsily leans on Vercel's Edge Network to ship a global, low-latency tenant experience. Public surfaces such as documentation and the help center now opt into incremental static regeneration with a 24 hour window so they are always served from the CDN.

## Route configuration

- `app/docs/page.mdx` and `app/help/page.mdx` export `revalidate = 86400` and run on the Edge runtime. This combination yields `Cache-Control: public, s-maxage=86400, stale-while-revalidate=86400` so the content is cached for a full day while allowing background refreshes.
- Segment-level configuration (`runtime = "edge"`, `dynamic = "force-static"`) lives alongside the pages to guarantee static output and avoid server region fallbacks.
- Layouts wrap the content in a lightweight prose container so the static HTML is minimal and compresses well across POPs.

## CDN directives

`vercel.json` now applies shared headers for `/docs`, `/help`, and legal marketing pages. The CDN serves a warm response instantly while revalidating in the background whenever stale content is requested. The home page retains a shorter one hour `s-maxage` so marketing updates land quickly while still benefiting from `stale-while-revalidate` resilience.

## Observability

The Playwright check in `tests/perf/edge-ttfb.spec.ts` measures time-to-first-byte for `/docs` and `/help`, enforces the cache headers, and validates the `x-vercel-id` metadata to ensure each response originates from a Vercel Edge POP and compute region. Thresholds are set to 100 ms; adjust `EDGE_TEST_REGIONS` and `EDGE_TEST_BASE_URL` env vars in CI to point at production deployments.

## Operational tips

- When content changes need to bypass the cache immediately, trigger a Vercel deploy or run `vercel cache purge` targeting `/docs` and `/help`.
- If you expand the help center with dynamic data, prefer `next/headers` `cache: "force-cache"` fetches so the page remains static while the data feeds stay fresh.
- Monitor `x-vercel-cache` values via the Playwright probe or observability tooling; frequent `MISS` responses usually indicate a misconfiguration or frequent redeploys.
