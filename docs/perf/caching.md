# Edge caching policy

Roomsily routes every request through [`middleware.ts`](../../middleware.ts) so we can make caching decisions at the edge before the app router executes. The middleware now inspects the Supabase session attached to the request and applies one of two caching strategies.

## Caching tiers

| Strategy | When it applies | Headers |
| --- | --- | --- |
| `public-edge` | Anonymous GET/HEAD requests to marketing surfaces (`/`, `/about`, `/contact`, `/privacy`, `/terms`) | `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` and `CDN-Cache-Control` mirror those values so Vercel’s edge cache can serve them globally. |
| `private-no-store` | Any request with an authenticated Supabase session, non-marketing paths, or non-idempotent verbs | `Cache-Control: private, no-store, max-age=0, must-revalidate` plus `Pragma: no-cache` to guard against intermediary caching. |

All responses also append a merged `Vary` header covering `Cookie`, `Authorization`, and the router specific headers (`RSC`, `Next-Router-State-Tree`, `Next-Router-Prefetch`). This keeps cached payloads scoped to the relevant session context.

## Tenant-aware invalidation

Middleware derives a tenant identifier from the Supabase session metadata when available and surfaces it via an `x-tenant-cache-tags` response header (`tenant:<id>`). Anonymous responses fall back to `tenant:public`, while uncached private responses default to `tenant:unknown`. Upstream processes that react to tenant mutations (e.g. Stripe or Supabase triggers) can call `revalidateTag('tenant:<id>')` or purge the matching Vercel cache tag to invalidate any derived content.

## Adding new cached routes

1. Ensure the page is entirely public and does not surface tenant-specific data.
2. Update `PUBLIC_EDGE_ROUTES` in `middleware.ts` with a regex covering the new path.
3. Run the middleware tests to confirm the caching behaviour: `pnpm test --filter "middleware caching"`.
4. Document any bespoke TTL requirements alongside the route so future changes stay consistent.

## Observability

Responses expose an `x-cache-strategy` header to simplify debugging in the network panel. `public-edge` denotes content eligible for the Vercel CDN, while `private-no-store` indicates we deliberately bypass caching for tenant-scoped traffic.
