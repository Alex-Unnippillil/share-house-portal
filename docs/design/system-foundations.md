# Design system foundations

This document standardizes how feature teams build tenant, property manager, and admin interfaces with Tailwind design tokens + shadcn/ui primitives.

## 1) Shared Tailwind tokens (`config/tailwind`)

The canonical token source is `config/tailwind/tokens.js`, consumed by `tailwind.config.ts` and `tailwind.config.js`.

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

## 3) Base layout shells

Use shared shells in `components/layouts/portal-shells.tsx`:

- `TenantLayoutShell`
- `PropertyManagerLayoutShell`
- `AdminLayoutShell`

Each shell provides:

- responsive nav (desktop sidebar + mobile sheet menu),
- role-specific IA starter links,
- normalized title/subtitle header,
- consistent content container sizing + spacing.

## 4) Accessibility defaults

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

## 5) Reusable UI patterns

### Status badge pattern

- Component: `components/patterns/status-badge.tsx`
- Supports domains: `payment`, `booking`, `maintenance`.
- Falls back to muted styling for unknown statuses.

### Timeline pattern

- Component: `components/patterns/activity-timeline.tsx`
- Designed for activity feeds (message updates, booking events, maintenance progress).
- Data shape is simple (`id`, `title`, `timestamp`, optional `description` + `meta`) to keep feature integration lightweight.

## 6) Lint-style state color checklist

Before shipping a product surface, verify all stateful colors pass this checklist:

- [ ] No hardcoded Tailwind palette utilities for state (`text-red-*`, `bg-green-*`, `border-yellow-*`, etc.) in feature components.
- [ ] Status visuals use semantic primitives (`StatusBadge`, shadcn `Badge` variants, or token-backed classes).
- [ ] Notification severities map to tokenized colors (`notification.info|success|warning|error`).
- [ ] Sidebar active states use shared token mappings (`sidebar.active`, `sidebar.active-foreground`).
- [ ] Dark and light mode both rely on `hsl(var(--...))` tokens rather than duplicated ad hoc classes.
