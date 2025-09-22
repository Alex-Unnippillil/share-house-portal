# Caching Policy Playbook

This playbook establishes how we configure and observe caching across the Share House Portal so that marketing content stays fast while Supabase-backed surfaces remain fresh.

## Route Segment Defaults

| Surface | Segment Settings | Cache Tag | Revalidation Window |
| --- | --- | --- | --- |
| Marketing pages (`/about`, `/privacy`, `/terms`) | `dynamic = 'force-static'` | _n/a_ | `REVALIDATION_WINDOWS.MARKETING` (12 hours) |
| Documents dashboard (`/documents`) | `fetchCache = FETCH_CACHE_BEHAVIOR.SUPABASE_MUTATIONS` | `CACHE_TAGS.DOCUMENTS` | `REVALIDATION_WINDOWS.DOCUMENTS` (60 seconds) |
| Payments hub (`/payments`) | `fetchCache = FETCH_CACHE_BEHAVIOR.SUPABASE_MUTATIONS` | `CACHE_TAGS.PAYMENTS` | `REVALIDATION_WINDOWS.PAYMENTS` (60 seconds) |

`config/cache.ts` owns the canonical values for these constants—treat it as the single source of truth when adding new routes.

## Expected Logging

- **Cache hits** – Vercel logs include `x-vercel-cache` headers for each request. A value of `HIT` or `STALE` indicates we served from cache. During QA, watch the request logs in the Vercel dashboard or `next dev` console to confirm the first request is a `MISS` followed by `HIT` once the response is cached.
- **Tag revalidation** – Server actions that mutate Supabase state must call `revalidateTag(CACHE_TAGS.<RESOURCE>)`. Successful calls surface as `Revalidated tag` messages in the Next.js debug logs when running locally with `NEXT_RUNTIME_DEBUG=1`.

## Operating Windows

- **Marketing copy** – Refresh every 12 hours so we can safely roll out legal or branding updates without forcing a deploy. Bump this window down temporarily if we publish time-sensitive announcements.
- **Supabase-backed dashboards** – Revalidate every 60 seconds. This keeps document and payment feeds within one minute of real-time while still allowing response caching to reduce load on Supabase.

When extending the app, pick a cache tag per Supabase table family, add it to `CACHE_TAGS`, and wire the corresponding route to use the same `tags` export. Document any deviations (shorter or longer windows) directly in this playbook.
