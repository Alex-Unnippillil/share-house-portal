# Loading States & Streaming Patterns

This portal leans heavily on React Suspense for both server and client components. The goal is to stream usable UI as soon as possible while isolating slow data sources behind resilient skeletons.

## Server Components

- Keep long-running fetches inside dedicated server components (e.g., `RentSummaryCard`). Each card exports an `async` function and awaits its data loader. While the promise is pending the nearest `<Suspense>` boundary renders a lightweight skeleton.
- Skeletons live alongside the feature they represent and expose a unique `data-testid` so tests can assert behaviour without relying on brittle text comparisons.
- Prefer colocated helpers (`app/**/data.ts`) to return mock or production data. These helpers can introduce an artificial delay when running locally so streaming behaviour is observable without external dependencies.

## Client Boundaries

- When a client component needs server-fetched data, split the tree: keep the fetch in a server wrapper and pass the hydrated result to a small client presenter. This keeps streaming on the server while preserving interactivity (`DocumentsList` → `DocumentsListClient`).
- If a client boundary must fetch independently, build a suspense-aware helper (React Query’s suspense mode or a custom resource wrapper) so the component can suspend instead of managing `loading` state manually.

## Testing

- Integration tests should render the server component with `renderToPipeableStream` and assert that the first streamed chunk contains the expected skeletons while the completed stream renders real data. See `tests/dashboard-streaming.test.tsx` and `tests/documents-streaming.test.tsx` for examples.
- Use the skeleton test identifiers to keep assertions resilient to copy changes while still verifying that streaming behaviour remains intact.

Following these conventions keeps dashboard and documents flows responsive even when upstream services are slow or offline.
