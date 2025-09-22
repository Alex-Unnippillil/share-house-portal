# Caching strategy

The Roomsily portal now layers deterministic caching around document, booking, and notification loaders to reduce redundant calls to Supabase and Cal.com while keeping responses fresh.

## Core primitives

- `lib/cache.ts` wraps `unstable_cache` as `createCachedLoader`. Loaders opt into caching by providing `keyParts`, `tags`, and (optionally) a TTL and custom cache key generator.
- Cached responses are tagged via `CACHE_TAGS` so downstream mutations can call `invalidateCacheTag(tag, reason)` to bust the Next.js data cache and any Upstash entries.
- When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured a lightweight Upstash Redis client is initialised. Cache entries are stored under the `roomsily:cache` namespace and each tag keeps a set of member keys for targeted invalidation. Without these env vars the system transparently falls back to in-region caching only.
- `createSupabaseClientWithToken` builds a short-lived Supabase client using the caller's JWT so cached queries still respect RLS.
- Invalidation events are appended to an in-memory log (`getCacheInvalidationLog`) and also emitted via `console.info([cache] …)` to aid monitoring.

## Loader coverage

| Domain        | Loader                                          | Tags applied                    | TTL |
|---------------|--------------------------------------------------|---------------------------------|-----|
| Documents     | `fetchDocumentsCached`, `fetchDocumentStatsCached` | `documents`, `document-stats`    | 120s / 60s |
| Bookings      | Cal.com event types, booking detail/list loaders | `bookings`                       | 300s / 120s |
| Notifications | `fetchNotificationsCached`                       | `notifications`                  | 60s |

Each loader normalises its cache key (e.g. sorted filter arrays, explicit booleans) so equivalent queries hit the same entry regardless of argument order.

## Invalidation matrix

| Triggering action                                    | Tags revalidated                  | Notes |
|------------------------------------------------------|----------------------------------|-------|
| Document upload / signing request / signature update | `documents`, `document-stats`    | Invoked through `revalidateDocumentCaches` in the respective server actions. |
| Cal.com booking creation                             | `bookings`                        | Fired when `createBooking` returns successfully. |
| Cal.com booking cancellation                         | `bookings`                        | Fired after a successful cancellation response. |
| In-app notification creation                         | `notifications`                   | Fired inside `sendInAppNotification` after Supabase insert. |

If additional workflows mutate these resources they should call `invalidateCacheTag` (or reuse `revalidateDocumentCaches`) so the above guarantees remain intact.

## Operational guidance

- **Enabling Upstash:** configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in your environment. Entries are automatically evicted on tag invalidation and respect loader TTLs. Without these variables caching still functions inside the regional Next.js data cache.
- **Monitoring:**
  - Watch application logs for `[cache] revalidating tag …` messages. The in-memory history from `getCacheInvalidationLog()` can be surfaced via health endpoints if deeper introspection is needed.
  - Upstash provides per-key metrics; the cache uses the prefixes `roomsily:cache:*` (entries) and `roomsily:cache-tag:*` (tag member sets).
  - Consider alerting on Upstash error logs—`createCachedLoader` already reports degraded states via `console.warn`.
- **Manual purges:** use `invalidateCacheTag(tag, reason)` when running administrative scripts or reacting to upstream fixes. The helper clears both Next.js caches and any mirrored Redis entries in a single call.

By consolidating all server loaders behind `createCachedLoader` the portal benefits from deterministic caching semantics today while leaving room for future resource-specific tuning (different TTLs, multi-tag entries, etc.).
