# Document Streaming Performance

## Overview
Tenant documents are now streamed through `/api/documents/[id]/stream`, which forwards byte range requests to Supabase Storage and always returns `Accept-Ranges: bytes` with `206 Partial Content` responses for ranged reads. The handler enforces document access checks against the viewer's session before proxying the file.

## Viewer Implementation
The in-app preview swaps the static `<iframe>` for a PDF.js-powered canvas renderer. Only the first 64&nbsp;KB chunk is requested initially and `disableAutoFetch` prevents the browser from eagerly downloading the rest of the PDF. The first page is rendered via PDF.js as soon as the first chunk arrives and we surface timing metadata in the viewer.

## Testing
Vitest coverage lives in `tests/pdf-streaming.test.ts` and asserts two critical behaviours:

- First-page render times stay under one second via `isFirstPageRenderFast`.
- PDF.js configuration uses chunked range requests so the entire file is not downloaded upfront.
- Range parsing helpers build the `Content-Range` metadata that the API route emits.

Run `pnpm test` to execute the suite.
