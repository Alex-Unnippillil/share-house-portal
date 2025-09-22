# Pagination Guidelines

Efficient pagination keeps heavy lists responsive while ensuring filters and role-based access rules stay intact. This guide captures the approach used for documents and messaging so new endpoints can follow the same pattern.

## Server-side patterns

1. **Validate inputs with Zod**
   - Compose a `filters` schema that mirrors the shape of accepted query parameters.
   - Reuse the shared [`paginationParamsSchema`](../../utils/pagination.ts) to coerce `limit`, `page`, and `cursor` values.
   - Return early with a 400-style error when cursors fail validation instead of falling back to unbounded queries.

2. **Normalize offset + cursor**
   - Call `normalizePaginationParams` to translate either a cursor or explicit page into an offset.
   - Always supply a deterministic fallback limit (e.g. 10) so the API has predictable defaults.

3. **Select with counts**
   - Request Supabase rows via `select(..., { count: 'exact' })` and append `.range(offset, offset + limit - 1)`.
   - Scope data using role checks *before* pagination so totals reflect the caller’s permissions.

4. **Return metadata**
   - Use `buildPaginationMetadata` with the `count`, `limit`, `offset`, and returned row count.
   - Send `{ total, page, pageCount, nextCursor, prevCursor }` so the client can render both classic pagination and “load more” experiences.

5. **Include applied filters**
   - Echo validated filter values in the payload to help clients sync UI state after a refetch.

## Client-side patterns

1. **Track cursors per page**
   - Maintain a `Record<number, string | null>` that stores the cursor that produced each page. This enables quick jumps back to previous pages without recomputing offsets.

2. **Reset state on filter change**
   - Memoise filters (`JSON.stringify` is a pragmatic helper) and reset `currentPage` + cursors when filters change.

3. **Optimistic rendering**
   - Only show skeleton loaders when the current page is empty; otherwise keep the previous page visible and disable controls while loading.

4. **Shared controls**
   - Reuse `<PaginationControls>` to keep Prev/Next, total counts, and range messaging consistent across surfaces.

## Quick checklist

- [x] Inputs validated with Zod, including pagination parameters.
- [x] Supabase queries scoped with `.range` and `count: 'exact'`.
- [x] Responses include `items`, `pagination`, and applied `filters`.
- [x] UI components request specific pages and surface pagination controls.

Following this template prevents accidental full-table scans and keeps navigation predictable as data grows.
