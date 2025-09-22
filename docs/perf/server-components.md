# Server component data loaders

The App Router should fetch Supabase-backed data on the server so that we ship
the minimum amount of client-side JavaScript and keep RLS-protected queries off
of the device. The general pattern is:

1. **Define a loader in `lib/data/`.** Loaders wrap Supabase queries and return
   serialisable payloads. They are responsible for applying RLS-aware filters
   and may reuse shared helpers such as `isLandlordRole`.
2. **Consume loaders from async server components.** Pages or nested layouts can
   `await` the loader and render directly on the server. When interactivity is
   required, serialise the results and pass them to client components as props.
3. **Keep interactive logic at the edge.** Client components like
   `NavLinks` or `DocumentActions` now accept the server-provided data instead of
   running their own Supabase queries.

### Example

- `lib/data/documents.ts` contains `fetchDocuments` and `fetchDocumentStats`.
- `app/documents/components/documents-list.tsx` is an async server component
  that calls those loaders and hands the resulting array to the interactive
  `DocumentActions` client component.
- `app/dashboard/layout.tsx` obtains the active user's role via
  `fetchCurrentUserRole` and passes it to the `NavLinks` client component so it
  can stay interactive while avoiding Supabase calls in the browser.

Following this structure keeps Supabase secrets on the server, improves Time to
First Byte (TTFB), and allows Suspense boundaries to stream server-rendered
skeletons while data loads.
