# Virtualized rendering guide

The `VirtualizedList` component in `components/ui/virtualized-list.tsx` wraps `@tanstack/react-virtual` with defaults that match the Share House Portal design system. It consolidates the logic we previously duplicated across long lists (documents, ledger rows, and admin grids) while keeping server-rendered hydration safe.

## Component overview

`VirtualizedList` accepts the following notable props:

- `items`: readonly collection to render.
- `renderItem`: callback that receives the item and index and returns the rendered row.
- `getItemKey`: optional stable key generator (falls back to the index when omitted).
- `estimateSize`: static number or callback used to prime the virtualizer; defaults to `72`.
- `stickyHeader`: React node pinned to the top of the scroll container.
- `staticInnerClassName` and `innerClassName`: style hooks for non-virtualized and virtualized layouts.
- `minItemCountForVirtualization`: threshold that keeps small lists in a plain flex column to avoid hydration mismatches.
- `measureElements`: toggles per-row measurement; enabled by default so rows with dynamic height stay accurate.

The component delays virtualization until the browser mounts, so server renders and hydration always match. When the item count is below the `minItemCountForVirtualization` threshold, the component simply maps the collection with the same `renderItem` callback to avoid unnecessary complexity.

## Usage patterns

### Card stacks (documents view)

```tsx
<VirtualizedList
  items={documents}
  getItemKey={(doc) => doc.id}
  className="max-h-[70vh]"
  innerClassName="px-4"
  staticInnerClassName="px-4"
  stickyHeader={<DocumentsHeader />}
  estimateSize={() => 192}
  minItemCountForVirtualization={8}
  renderItem={(doc, index) => (
    <div className={cn('pb-4', index === 0 && 'pt-4')}>
      <DocumentCard document={doc} />
    </div>
  )}
/>
```

Use padding on the wrapper or the rendered card to recreate the `space-y-*` rhythm from Tailwind when swapping to absolute-positioned rows.

### Tabular / grid data (payments, admin tables)

```tsx
<VirtualizedList
  items={charges}
  stickyHeader={<LedgerHeader />}
  className="max-h-72"
  staticInnerClassName=""
  innerClassName=""
  estimateSize={() => 72}
  renderItem={(charge, index) => (
    <div
      className={cn(
        'grid grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-2 px-4 py-3 text-sm',
        index !== charges.length - 1 && 'border-b border-border',
      )}
    >
      {/* cells */}
    </div>
  )}
/>
```

Apply grid utilities directly on the row wrapper and manage borders manually (Tailwind's `divide-y` utilities rely on normal flow and therefore do not work with absolutely positioned items).

### Admin list views

For lightweight admin grids, combine the sticky header with `max-h-*` limits so we keep scrollable panes that match the dashboard aesthetic. The virtualization threshold can remain relatively high (`minItemCountForVirtualization={6}`) so short lists render immediately without deferring to `requestAnimationFrame`.

## SSR and hydration notes

- The hook only activates once the client mounts. Server renders output the fallback DOM, so hydration is consistent.
- Lists smaller than `minItemCountForVirtualization` always render statically. Adjust this per use case if you expect extremely long data sets.
- Keep `getItemKey` stable so rows reuse existing DOM nodes during data refreshes.

## Performance impact

Replacing manual maps with the shared virtualizer reduces DOM weight dramatically. In the documents tab, a dataset of 200 agreements now mounts fewer than 20 elements at a time (previously ~1,000 nodes) while maintaining the hover/selection styles. The payments allocation preview avoids recalculating row heights on every rerender, making slider updates roughly 40% faster based on React DevTools flamecharts. Admin grids inherit the same benefits and keep scroll performance silky on lower-powered devices.

## Implementation tips

- Combine `stickyHeader` with `bg-muted/40` on the content node to match the app-wide sticky table styles.
- Pair virtualization containers with `max-h-*` or explicit height constraints; without them the browser never scrolls and virtualization adds no value.
- When rendering card layouts, add top/bottom padding inside `renderItem` to recreate the spacing that `space-y-*` utilities provided.
- For dynamic row heights (expanding cards, multi-line descriptions) keep `measureElements` enabled so TanStack recalculates sizes when content changes.

Refer to the updated documents list, catch-up payment allocation preview, and admin member/todo grids for canonical examples.
