# Lease Pagination Contract

This document captures the server-side pagination contract that powers the Documents → Leases view. The goal is to keep rendering fast for tenants that accumulate hundreds or thousands of historical leases while preserving existing filter semantics.

## Loader Signature

`getLeasePageAction(params?: { limit?: number; cursor?: string; filters?: DocumentListFilters })`

- **Authentication** – requires an authenticated Supabase session. Non-authenticated callers receive `success: false` with an error message.
- **limit** – optional integer, defaults to `25`, capped at `100`. Controls the number of leases returned per page.
- **cursor** – optional ISO 8601 timestamp (e.g. `2024-01-01T12:00:00.000Z`). Represents the `created_at` value of the last lease from the previous page.
- **filters** – optional `DocumentListFilters`. Status, tenant, unit, and date filters are respected; document type filters are ignored because the loader always scopes to `lease` documents.

## Response Payload

The action returns `Promise<ActionResult<PaginatedDocumentsResult>>` where:

```ts
interface PaginatedDocumentsResult {
  items: DocumentWithLease[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

- **items** – array of documents joined with the matching lease record.
- **nextCursor** – `created_at` cursor for the next request when more data is available, otherwise `null`.
- **hasMore** – indicates whether additional pages are available.

### Example Interaction

```ts
// Initial request
const first = await getLeasePageAction({ limit: 25 });

// Subsequent page using cursor returned above
const second = await getLeasePageAction({
  limit: 25,
  cursor: first.data?.nextCursor ?? undefined,
});
```

1. Call without a cursor to receive the newest 25 leases and a `nextCursor` when more pages exist.
2. Pass the cursor into the next invocation to retrieve the following slice.
3. Repeat until `hasMore` is `false`.

## Performance Validation

The Vitest suite includes `tests/documents/lease-pagination.test.ts` which exercises the pagination helper with 1,000 synthetic leases. The helper trims the payload to the requested limit and completes in well under one second, guaranteeing that the UI never attempts to render the full collection at once.
