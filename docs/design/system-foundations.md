# Design system foundations

This document standardizes how feature teams build tenant, property manager, and admin interfaces with Tailwind design tokens + shadcn/ui primitives.

## 1) Shared Tailwind tokens (`config/tailwind`)

The canonical token source is `config/tailwind/tokens.js`, consumed by the canonical `tailwind.config.js`.

### Spacing tokens

- `section`: consistent vertical rhythm between major page regions.
- `content-gutter`: responsive horizontal page padding for mobile through desktop.
- `card-gap`: spacing between card-level siblings.
- `stack-sm`, `stack-md`, `stack-lg`: stack spacing inside cards and forms.

### Color tokens

- `brand.*`: shared platform brand scale.
- `payment.*`: payment lifecycle colors (`paid`, `pending`, `failed`, `refunded`).
- `booking.*`: booking lifecycle colors (`confirmed`, `pending`, `conflict`, `cancelled`).
- `maintenance.*`: maintenance lifecycle colors (`open`, `inProgress`, `blocked`, `resolved`).

### Typography tokens

Use semantic font tokens rather than ad hoc `text-*` classes:

- Display: `display-xl`, `display-lg`.
- Headings: `heading-md`, `heading-sm`.
- Body copy: `body-lg`, `body-md`, `body-sm`.
- Metadata: `label-sm`.

## 2) shadcn/ui primitive usage guidelines

### Cards

- Use `Card` for every dashboard panel and detail module.
- Keep card hierarchy predictable: `CardHeader` (title + supporting summary), `CardContent` (data/actions), optional `CardFooter` (secondary actions).
- Use `gap-card-gap` for internal card grids to preserve rhythm.

### Tabs

- Use Tabs for equal-priority content branches (e.g., "Payments", "Bookings", "Documents").
- Ensure each `TabsTrigger` has concise labels and corresponding `TabsContent` with matching `value`.
- On mobile, prefer 2-4 triggers; overflow should switch to stacked controls or segmented nav.

### Dialogs

- Use `Dialog` only for focused workflows: confirmations, quick-create, inline edits.
- Always include `DialogTitle` and meaningful helper copy via `DialogDescription`.
- Primary action is right aligned and destructive actions use destructive button semantics.

### Form controls

- Use shadcn `Form` + `FormField` composition so labels, descriptions, and errors remain consistent.
- Every input needs:
  - visible `Label`,
  - `FormMessage` for validation,
  - helpful placeholder/example only when it reduces ambiguity.

### Tables

- Use table primitives for dense operational lists (payments, bookings, maintenance queues).
- Include sortable headers when data can exceed one screen.
- Pair row status with the shared `StatusBadge` pattern.

### Badges

- Use badges for status, role, and policy-level metadata only.
- Prefer semantic status colors (`payment.*`, `booking.*`, `maintenance.*`) over arbitrary palettes.

## 3) Canonical application navigation

The canonical navigation system is `SiteHeader` + `MainNav` + `MobileNav`, all driven from `config/navigation.ts` (`getRoleNavigation`).

- Desktop: `components/main-nav.tsx`
- Mobile: `components/mobile-nav.tsx`
- Shared orchestration: `components/site-header.tsx`

This is the only navigation system that should receive net-new UX updates.

### Deprecated or removed alternatives

- `app/dashboard/components/SideNav.tsx`, `MobileSideNav.tsx`, and `NavLinks.tsx` are removed.
- `components/layouts/portal-shells.tsx` is deprecated and retained temporarily for migration safety.

Do not create new route-level side navigation variants unless an ADR introduces a new canonical pattern.

## 4) Visual baseline: what "good" looks like

### Spacing baseline

- Page chrome uses `p-content-gutter`; content sections use `gap-section`.
- Cards stack with `gap-card-gap`; internal card content uses `stack-sm` to `stack-lg` intentionally.
- Dense nav actions keep a minimum target of `min-h-10` to `min-h-11` for touch accessibility.

### Typography baseline

- Page/route titles use `text-display-lg`.
- Card and module headings use `text-heading-md` or `text-heading-sm`.
- Standard copy uses `text-body-md`; helper copy/meta uses `text-body-sm` or `text-label-sm`.
- Avoid ad hoc one-off text sizing unless documented as an explicit exception.

### Surface usage baseline

- Use neutral `bg-background` for page base and `Card` for grouped information.
- Use `bg-muted`/`bg-muted/60` only for secondary emphasis (active nav affordance, grouped controls).
- Reserve high-contrast brand surfaces (`bg-primary`, status variants) for selected states, priority badges, and primary actions.
- Preserve visible borders (`border`, `border-border/60+`) when separating adjacent interactive clusters.

## 5) Accessibility defaults

### Focus states

- Interactive controls must retain visible focus indicators (`focus-visible:ring-2` or equivalent).
- Do not remove outlines unless replacing them with an equal-or-better focus style.

### ARIA + labeling

- Every form control requires a programmatic label.
- Icon-only buttons require `aria-label` text.
- Dialogs must announce context via `DialogTitle` and `DialogDescription`.

### Keyboard patterns

- All primary flows must be keyboard accessible (Tab/Shift+Tab, Enter/Space activation, Escape close for dialogs/sheets).
- Preserve logical tab order by following DOM order and avoiding positive tab indices.

### Contrast

- Ensure text + icon contrast meets WCAG AA (4.5:1 normal text, 3:1 large text/icons).
- Status colors must remain readable in light and dark mode; combine hue + label text instead of color-only signaling.

## 6) Reusable UI patterns

### Status badge pattern

- Component: `components/patterns/status-badge.tsx`
- Supports domains: `payment`, `booking`, `maintenance`.
- Falls back to muted styling for unknown statuses.

### Timeline pattern

- Component: `components/patterns/activity-timeline.tsx`
- Designed for activity feeds (message updates, booking events, maintenance progress).
- Data shape is simple (`id`, `title`, `timestamp`, optional `description` + `meta`) to keep feature integration lightweight.
