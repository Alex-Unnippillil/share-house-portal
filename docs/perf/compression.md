# Compression Troubleshooting Guide

The Share House Portal uses brotli for static assets and falls back to gzip for JSON responses. The middleware enforces brotli (when supported) on `_next/static` output and public assets, while API routes reuse a shared helper (`createCompressedJsonResponse`) that negotiates between brotli and gzip.

## Quick verification checklist

1. **Run the automated check** – `pnpm check:compression`
   - Builds the Next.js app unless `SKIP_COMPRESSION_BUILD=1` is set.
   - Boots `next start` on port `4310` and verifies both the `/perf/compression-sample.json` asset and `/api/system/compression` route shrink by ≥20%.
2. **Confirm response headers**
   - Static assets: `Content-Encoding: br`, `Vary: Accept-Encoding`.
   - API responses: `Content-Encoding: gzip` (unless the client explicitly prefers brotli).
   - Both should expose `Content-Length` that reflects the compressed payload size.
3. **Check serverless defaults** – Ensure `vercel.json` retains `"compress": true` and the `/api/(.*)` header overrides so serverless functions continue to advertise compression.

## Common issues & fixes

### `Content-Encoding` header missing for assets
- Inspect middleware logs (if added) and confirm the request path matches `_next/static` or a recognised static extension.
- Some asset requests may originate with `Accept-Encoding: identity`. In that case the middleware intentionally skips overriding the encoding. Verify the client advertises brotli.
- When running locally with custom tooling, ensure proxy servers are not stripping `Accept-Encoding` before the request reaches Next.js.

### API responses return uncompressed JSON
- Verify the route uses `createCompressedJsonResponse`. Mixing `NextResponse.json` or `Response.json` bypasses gzip.
- Look for missing `accept-encoding` in the client request. The helper falls back to gzip only when the header is absent or explicitly includes gzip.
- On Vercel, confirm the function is deployed as a Node.js runtime (configured through `vercel.json`). Edge runtimes cannot use Node’s `zlib` compression utilities.

### Automated script fails to start the server
- The script runs `pnpm build` followed by `pnpm start`. Ensure dependencies are installed via `pnpm install`.
- Ports 4310/`COMPRESSION_PORT` must be free. Override via environment variables: `COMPRESSION_HOST=0.0.0.0 COMPRESSION_PORT=4321 pnpm check:compression`.
- `next start` requires production builds. If the build step was skipped (`SKIP_COMPRESSION_BUILD=1`), make sure a valid `.next` folder already exists.

### Compression ratio is <20%
- Check the payload content – highly random data will not compress well. Our sample routes intentionally include repetitive strings; real data may need additional redundancy (e.g., stringifying structured objects instead of pre-compressed binaries).
- Ensure reverse proxies/CDNs aren’t re-compressing or stripping the `Content-Length` header. The verification script relies on `Content-Length` to compare sizes.

## Manual inspection tips

- Use `curl` for ad-hoc checks:
  ```bash
  curl -H 'Accept-Encoding: br' -I http://localhost:3000/perf/compression-sample.json
  curl -H 'Accept-Encoding: gzip' -H 'Content-Type: application/json' \
    -d '{"intent":"manual"}' http://localhost:3000/api/system/compression
  ```
- To capture the raw compressed payload size, proxy through `curl --output` and inspect the resulting file size.
- Browser DevTools → Network tab also exposes the encoded/decoded sizes under “Transferred” vs “Resource”.

Maintaining these checks ensures roommates experience faster load times and reduces bandwidth consumption for both static and dynamic responses.
