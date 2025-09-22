# State Management Guidelines

The dashboard renders a mix of server and client components, so we need to be deliberate about where state lives. The following guidelines keep re-renders localized and avoid expensive component trees reacting to unrelated changes.

## Prefer local state

- Reach for `useState` or component props before introducing a context provider.
- Promote values to context only when **multiple distant components** need to react to the same updates.
- When global persistence is required (e.g., `localStorage` hydration), keep the persistence logic inside the owning component instead of pushing those values downstream.

## When context is unavoidable

- Build contexts with [`use-context-selector`](https://github.com/dai-shi/use-context-selector) so that consumers subscribe only to the slices they read.
- Expose selector hooks (`useSidebarOpen`, `useSidebarToggle`, etc.) rather than the raw store object to keep caller APIs narrow.
- Memoize provider values with `useMemo` and keep callbacks stable with `useCallback` so selectors receive referentially equal outputs across updates.
- Never place loading flags or other one-off UI state in the context value—compute them locally and render the provider only when ready.

## Scope providers intentionally

- Wrap the **smallest subtree** that needs shared state. For example, the sidebar store now lives inside the dashboard layout rather than the entire app shell.
- Avoid nesting providers inside high-traffic server components unless the value is required in every branch.

## Test render containment

- Add regression tests whenever you introduce a new context. The `tests/sidebar-state.test.tsx` suite verifies that action-only consumers (like toggle buttons) avoid unnecessary rerenders when state flips.
- Prefer [`@testing-library/react`](https://testing-library.com/docs/react-testing-library/intro/) with Vitest’s JSDOM environment for these checks so you can assert render counts and user interactions.
