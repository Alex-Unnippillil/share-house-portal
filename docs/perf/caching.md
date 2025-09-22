# Data Cache Tagging

This project relies on Next.js tag-based revalidation to keep tenant data fresh while avoiding duplicate upstream fetches. The table below documents the tags that must stay in sync across read and write paths.

| Tag | Scope | Invalidated By | Notes |
| --- | --- | --- | --- |
| `documents` | Document lists scoped per user/filter | Uploads, signing requests, signature completions | Backed by `fetchWithTagCache` to prevent duplicate document queries. Mutations call `revalidateTag('documents')` and clear the local tag cache. |
| `document-stats` | Aggregate counts for the documents dashboard | Same mutations as `documents` | Stats derive from the same source table. Writers invalidate this tag alongside `documents` to avoid stale counts. |
| `bookings` | Amenity booking schedules and schedule meeting confirmations | Successful meeting creation | Used by both the `/bookings` overview and `/schedule` workflow. Revalidated after inserting new meetings. |

## Usage guidelines

- Server read helpers should wrap expensive Supabase queries with `fetchWithTagCache(key, tags, fetcher)` so repeated calls during a render cycle reuse cached data.
- Any mutation that changes data associated with a tag **must** call both `invalidateTagCache([...tags])` and `revalidateTag(tag)` for each affected tag.
- Route segments that surface cached data should declare `export const fetchCache = 'force-cache'` and `export const tags = [...]` so that `revalidateTag` invalidates the correct payloads during navigation.
- Prefer granular tags (for example, `documents:user-${id}`) when caching per-tenant slices to avoid cross-tenant data leakage. Always include the broader collection tag (e.g. `documents`) so that global invalidations work.

Following this taxonomy keeps the documents dashboard and booking tools responsive without stale reads.
