# Modal Routing Pattern

This application uses the Next.js App Router's **parallel routes** and **route intercepts** to deliver modal experiences that behave like real pages. The goal is to keep complex flows (document previews, amenity booking forms, etc.) routable while still presenting them in lightweight overlays.

## Core Concepts

- **Parallel `@modal` Route** – Both `/documents` and `/bookings` expose a dedicated `@modal` slot in their layouts. Each layout renders its page content and then the modal slot so intercepts can mount overlays without disrupting the background.
- **Intercepted Child Routes** – Navigating from `/documents` to `/documents/[id]?modal=preview` or `/bookings` to `/bookings/[amenityId]?modal=book` triggers intercept routes stored under `@modal/(.)[segment]`. These intercepts only activate when a user is already within the parent route; direct deep links fall back to full-page variants in `/documents/[id]`.
- **Lazy Modal Content** – Intercept routes stream a modal shell immediately and dynamically import the heavy content (`DocumentPreviewModal`, `AmenityBookingModal`) inside `Suspense`. Skeleton placeholders keep the UI responsive while the modal payload loads.
- **Route-driven Navigation** – Client components call `router.push` with the modal query parameter instead of toggling local state. Closing a modal uses history-aware logic (`RouteModal`) that falls back to pushing the parent route when opened from a deep link, ensuring the back button behaves predictably.

## File Structure Overview

```
app/
  documents/
    layout.tsx               # exposes { children, modal }
    [id]/page.tsx            # full-page document view
    @modal/(.)[id]/page.tsx  # intercepts preview modal
    components/
      document-preview-content.tsx
      document-preview-modal.tsx
      document-preview-skeleton.tsx
  bookings/
    layout.tsx
    @modal/(.)[amenityId]/page.tsx
    components/
      amenity-booking-modal.tsx
      amenity-booking-skeleton.tsx
```

The shared `components/route-modal.tsx` helper wraps shadcn's `Dialog` to standardise dismissal behaviour. It traps outside clicks/escape, checks browser history, and redirects to the configured fallback route when needed.

## Authoring New Modal Flows

1. **Add a Parallel Slot** – Ensure the route tree includes a layout with `{ children, modal }` and a `@modal/default.tsx` that returns `null`.
2. **Create the Intercept** – Place a `(.)[slug]/page.tsx` (or `(..)` variants for deeper paths) inside the `@modal` directory. Gate rendering on a `modal` search parameter if multiple modal types share the same segment.
3. **Stream Content** – Wrap the loader in `<Suspense>` and dynamically import the modal UI so the shell renders immediately. Provide a skeleton component for the fallback.
4. **Navigate via Router** – Trigger modals with `router.push('/route/segment?modal=type', { scroll: false })`. Use the shared `RouteModal` to keep close/back behaviour consistent.

Following this pattern keeps modals linkable, improves perceived performance through streaming shells, and guarantees that deep links always resolve to a usable page experience.
