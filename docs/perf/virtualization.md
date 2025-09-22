# List Virtualization

Large UI surfaces such as the documents library and roommate message board now rely on the shared `VirtualizedList` wrapper to stream content efficiently. The wrapper is built on top of [`@tanstack/react-virtual`](https://tanstack.com/virtual) and centralises common accessibility fallbacks so individual screens can stay declarative.

## Component overview

`components/ui/virtualized-list.tsx` exposes a render-prop API:

```tsx
<VirtualizedList
  items={items}
  estimateSize={(item) => /* return approximate pixel height */}
  getKey={(item) => item.id}
  overscan={6}
  itemClassName="py-2"
  parentProps={{ className: 'relative' }}
  useWindowScroll
>
  {({ item, index }) => (
    /* render row */
  )}
</VirtualizedList>
```

### Props

| Prop | Description |
| --- | --- |
| `items` | Array of row data to render. |
| `children` | Render function that returns JSX for each row. |
| `estimateSize` | Returns the estimated pixel height for a row; it is refined automatically via measurements. |
| `getKey` | Optional stable key generator for deterministic rendering. |
| `overscan` | Number of extra items to render before/after the viewport (defaults to `8`). |
| `virtualizationThreshold` | Minimum item count before virtualization is applied (defaults to `1`). |
| `role` / `itemRole` | Accessibility roles (defaults to `list` / `listitem`). |
| `parentProps` | DOM props applied to the virtualised container. |
| `fallbackParentProps` | DOM props applied when virtualization is disabled. |
| `itemClassName` | Shared class name applied to each virtual row wrapper. |
| `useWindowScroll` | When `true`, virtualization tracks the window scroll position instead of a dedicated scroll container. |

### Accessibility fallbacks

- If the user has `prefers-reduced-motion` enabled, virtualization is skipped and the full list is rendered so screen readers have complete access to the content.
- The fallback branch reuses the same render function, so no additional markup is needed for SSR skeletons or Suspense boundaries.

## Usage examples

### Documents list

```tsx
<VirtualizedList
  items={documents}
  estimateSize={(doc) => (doc.signatures?.length ? 228 : 188)}
  getKey={(doc) => doc.id}
  overscan={6}
  itemClassName="pb-4"
  parentProps={{ className: 'relative' }}
  useWindowScroll
>
  {({ item }) => <DocumentCard document={item} />}
</VirtualizedList>
```

### Roommate board

```tsx
<VirtualizedList
  items={messages}
  estimateSize={(message) => (message.content.length > 120 ? 72 : 56)}
  getKey={(message) => message.id}
  itemClassName="py-2 text-sm"
  parentProps={{ className: 'relative text-sm' }}
  useWindowScroll
>
  {({ item }) => <p className="leading-snug">{item.content}</p>}
</VirtualizedList>
```

## Implementation notes

- Skeleton states remain server-rendered. The virtualized list only mounts once data is available, preserving loading placeholders for Suspense boundaries.
- Always keep `estimateSize` reasonably close to the real height; the virtualizer refines the measurement using `measureElement`, but a sensible starting point reduces layout shifts.
- When a list should scroll within its own container instead of the window, pass `useWindowScroll={false}` and provide a scrollable wrapper via `parentProps`.
