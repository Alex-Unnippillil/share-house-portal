# Dashboard Shell Composition

This folder contains the dashboard shell primitives and navigation components used by routes under `app/dashboard`.

## Composition contract

- `DashboardShellFrame`: top-level horizontal shell (`sidebar + content`).
- `DashboardSidebarRail`: fixed-height sidebar rail (`h-screen`) for desktop navigation.
- `DashboardMainPanel`: primary content region with shared background and `content-gutter` spacing token.
- `DashboardSectionStack`: vertical section spacing powered by the `section` spacing token.
- `DashboardCardGrid`: repeatable card-grid primitive for 2-up card layouts.
- `DashboardAsyncBoundary`: wraps `ErrorBoundary + Suspense` so route sections can stream with a consistent fallback contract.

Recommended shell structure:

```tsx
<DashboardShellFrame>
  <DashboardSidebarRail>
    <SideNav />
    <MobileSideNav />
  </DashboardSidebarRail>

  <DashboardMainPanel>
    <ToggleSidebar />
    <DashboardAsyncBoundary fallback={<RouteSkeleton />}>
      {children}
    </DashboardAsyncBoundary>
  </DashboardMainPanel>
</DashboardShellFrame>
```

## Breakpoint behavior

- `< lg`:
  - Sidebar content is hidden by default (`SideNav` desktop rail is not rendered).
  - `ToggleSidebar` opens the `Sheet` from `MobileSideNav`.
  - Main panel remains full width with tokenized gutters.
- `>= lg`:
  - Sidebar rail is persistent.
  - Toggle button is hidden.
  - Multi-column dashboard layouts (`xl`) expand into split metric/action and content/rail grids.

## Styling guardrails

Dashboard modules should prefer shared spacing tokens over ad-hoc classes:

- `gap-section`
- `gap-card-gap`
- `p-content-gutter`
- `space-y-stack-sm|md|lg`

These patterns are defined in `config/tailwind/tokens.js` and wired via the Tailwind config.
