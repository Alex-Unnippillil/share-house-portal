# Network Resilience Toolkit

This application now ships with a set of client-side resiliency primitives to keep Supabase-backed
interactions predictable during degraded network conditions. The patterns below explain how the
retryable fetcher, Supabase connectivity monitor, mutation queueing, and UI affordances work
together.

## Fetcher resilience

- `lib/utils.ts` exports a `fetcher` helper that wraps `window.fetch` with exponential backoff,
  jitter, and retry-aware idempotency keys.
- Retries are attempted for 408/425/429 responses and all `>=500` server errors. Network errors also
  retry automatically.
- When the request method is `POST`, the helper attaches an `Idempotency-Key` header. The key is
  generated once per call (or supplied explicitly) so that all retries for the same request are safe
  to replay on the server.
- JSON responses are parsed automatically; non-JSON responses fall back to raw text.

Use the helper instead of raw `fetch` for API calls that should survive transient failures:

```ts
const result = await fetcher<MyPayload>("/api/notifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})
```

## Supabase connectivity provider

- `components/network/supabase-connectivity-provider.tsx` exposes
  `SupabaseConnectivityProvider` and `useSupabaseConnectivity()`.
- The provider keeps a lightweight realtime connection open, monitors `navigator.onLine`, and polls
  Supabase's realtime connection state once per second.
- It maintains a mutation queue (`enqueueMutation`) with client-side deduplication. A mutation key is
  required; combine it with `stableHash` to derive deterministic keys from payloads.
- When the connection is offline or reconnecting, new mutations are queued. Once the realtime client
  reports an open connection, the queue flushes sequentially.
- Mutations re-queue automatically if a network interruption occurs mid-flight so work is not lost.

### Using `enqueueMutation`

```ts
const { enqueueMutation } = useSupabaseConnectivity()
const key = `profiles:update:${stableHash(payload)}`

await enqueueMutation(key, async () => {
  const { error } = await supabase.from("profiles").upsert(payload)
  if (error) throw error
})
```

- If an identical key is already queued or executing, `enqueueMutation` returns the existing promise
  so duplicate writes are avoided.
- Wrap optimistic UI updates around `enqueueMutation` to keep the interface responsive. Attach
  `.catch()` handlers when you need to trigger a data refresh or surface errors after reconnecting.

## Offline banner & user messaging

- `SupabaseOfflineBanner` surfaces a sticky banner whenever the provider reports `offline` or
  `reconnecting`. It shows the number of queued mutations so tenants understand their changes are
  staged.
- Forms that queue work (visitor booking, maintenance requests, account profile updates) now show a
  toast when actions are cached offline and replay when connectivity resumes.

## Components updated to use the queue

- Visitor bookings, maintenance requests, notification reads/deletes, avatar uploads, and profile
  updates all run inside `enqueueMutation` to gain offline queuing and deduping.
- `stableHash` in `lib/utils` generates deterministic keys for composite payloads, ensuring queued
  work is merged rather than duplicated.

## Testing & future work

- Exercise offline scenarios by toggling network throttling in DevTools; the banner should appear and
  queued mutations should persist until connectivity returns.
- When adding new Supabase mutations, prefer `enqueueMutation` with a descriptive key and reuse the
  shared fetcher for HTTP requests so future resiliency improvements apply automatically.
