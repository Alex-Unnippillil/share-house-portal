# Error Handling Patterns

This guide documents how we shield interactive dashboard panels from catastrophic failures while giving tenants actionable recov
ery paths.

## Goals

- Prevent a runtime exception in one widget from collapsing the entire page shell.
- Offer clear messaging and a retry affordance so users can re-attempt lightweight fetches without a full reload.
- Ensure boundaries reset automatically as filters, tabs, or inputs change.

## Shared `ErrorBoundary`

Use `components/feedback/ErrorBoundary` for any client-side widget that may throw during rendering, effects, or event handling.
It exposes a render-prop API so feature teams can tailor the fallback UI while still inheriting retry behaviour.

```tsx
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

<ErrorBoundary
  resetKeys={[JSON.stringify(filters)]}
  fallbackRender={({ error, reset }) => (
    <PanelError message="Unable to load payments" detail={error.message} onRetry={reset} />
  )}
>
  <PaymentsWidget filters={filters} />
</ErrorBoundary>
```

### Retry semantics

- Call the provided `reset` handler to clear the boundary state and re-render children.
- Pass `resetKeys` so the boundary also resets when upstream inputs change (e.g., tab value, search query).
- Optionally supply `onReset` to clear local caches or invoke analytics before retrying.

### Default fallback

If no render prop/component is provided the boundary renders a minimal message with a retry button. Prefer a custom fallback for
widgets with domain-specific copy.

## Widget Guidelines

### Data fetching components

Components such as `DocumentsList` should throw when a request fails so the boundary can render the shared fallback. Resetting
the boundary re-mounts the widget and restarts the fetch cycle.

```tsx
if (error) {
  throw new Error(error)
}
```

### Presentational analytics

Even static analytics like `BookingStats` should live behind a boundary so a regression in the stats layer does not break the
booking flow. Keep the fallback concise and oriented around the insight users expected to see.

### Suspense integration

Wrap `Suspense` inside the boundary. This allows us to stream skeleton states while still catching runtime exceptions once the
component resolves.

```tsx
<ErrorBoundary fallbackRender={...}>
  <Suspense fallback={<WidgetSkeleton />}>
    <Widget />
  </Suspense>
</ErrorBoundary>
```

## Monitoring

Surface errors through `onError` when additional logging is required. For example, pipe the error to Sentry or Supabase logs
while continuing to render the graceful fallback:

```tsx
<ErrorBoundary onError={(error) => captureException(error)}>
  <RealtimeFeed />
</ErrorBoundary>
```

By standardising boundaries around every dashboard panel we keep the portal resilient and predictable even when downstream
integrations misbehave.
