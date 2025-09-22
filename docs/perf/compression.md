# Compression Verification Guide

This document captures the manual checks used to confirm compression is configured correctly for both API responses and hashed static assets.

## Prerequisites

- Install dependencies with `pnpm install`.
- Build the application and run it in production mode so the same headers used in Vercel are applied:

  ```bash
  pnpm build
  pnpm start
  ```

  The server listens on port `3000` by default.

## Validate API response compression

1. In a separate terminal send a request that prefers Brotli. The Stripe webhook route is safe to call locally—without environment variables it returns an error payload that we can inspect:

   ```bash
   curl -i -X POST \
     -H "Accept-Encoding: br" \
     http://localhost:3000/api/stripe/webhook
   ```

   Expected results:

   - `Content-Encoding: br` is present.
   - The `Vary: Accept-Encoding` header is set.
   - The response status is `500` with a JSON body explaining that the webhook secret is not configured.

2. Repeat the call while preferring gzip to ensure the fallback works:

   ```bash
   curl -i -X POST \
     -H "Accept-Encoding: gzip" \
     http://localhost:3000/api/stripe/webhook
   ```

   You should now see `Content-Encoding: gzip`.

3. Omit the `Accept-Encoding` header to confirm the server gracefully falls back to an uncompressed payload while still sending `Vary: Accept-Encoding`.

## Validate streaming response headers

When building a streaming endpoint, wrap the stream with `createStreamingResponse` from `@/lib/http/compression`. The helper sets `Content-Encoding: identity` and preserves the `Vary: Accept-Encoding` contract so intermediary caches do not attempt to buffer or recompress the stream.

To confirm this in practice, start the server and hit your streaming endpoint with `curl -i -N` (the `-N` flag keeps curl from buffering the stream). Inspect the response headers and verify that `Content-Encoding` is `identity` and `Vary` includes `Accept-Encoding`.

## Validate hashed asset headers

1. With the production server still running, list one of the generated bundle names:

   ```bash
   ls .next/static/chunks/app | head -n 1
   ```

   Copy one of the filenames (for example, `layout-abcdef12.js`).

2. Request that asset while advertising Brotli support:

   ```bash
   curl -I \
     -H "Accept-Encoding: br" \
     "http://localhost:3000/_next/static/chunks/app/<copied-filename>"
   ```

   Confirm the response includes:

   - `Cache-Control: public,max-age=31536000,immutable`
   - `Vary: Accept-Encoding`
   - A `Content-Encoding` value of `br` or `gzip`, depending on what the runtime negotiated.

These checks cover both API behaviour and static asset delivery so we can be confident the deployment is serving compressed payloads end-to-end.
