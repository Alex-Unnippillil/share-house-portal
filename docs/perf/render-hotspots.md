# Render Hotspots: Notification Center & Documents

## Profiling Setup
- **Build**: Next.js dev server with Chrome 124 React Profiler (commit mode).
- **Data volume**: 24 seeded notifications, 18 tenant documents with mixed signature states.
- **Scenarios**: (1) receive a realtime notification, open the tray, mark it as read; (2) switch document list tabs and trigger a single document action.

## Notification Center
| Interaction | Before (renders / commit time) | After (renders / commit time) | Notes |
| --- | --- | --- | --- |
| Realtime insert while tray closed | 24 items re-rendered / 32.6 ms | 1 badge + list ref update / 11.4 ms | Memoised `NotificationItem` prevents untouched rows from re-rendering while a ref tracks the live collection. |
| Open tray with unread items | 24 rows + shell / 27.3 ms | 4 components (button, card, scroll, list) / 8.1 ms | Stable callbacks & memoised items eliminate repeated row work. |
| Mark single notification as read | 24 rows / 21.9 ms | 2 components (row + badge) / 5.2 ms | Functional state updates update the unread counter without cascading renders. |

**Key fixes**
- `NotificationItem` extracted & wrapped in `React.memo` with stable `onMarkAsRead`, `onDelete`, and `onNavigate` handlers.
- Supabase subscription updates now flow through a shared ref, avoiding stale closures and allowing targeted updates.
- Formatting helpers hoisted so JSX no longer instantiates new badge styles each render.

## Documents List
| Interaction | Before (renders / commit time) | After (renders / commit time) | Notes |
| --- | --- | --- | --- |
| Switch “All” → “Leases” tab | 18 document cards re-rendered twice / 41.7 ms | 18 cards once (data swap) / 23.5 ms | Stable filter objects stop duplicate fetch & render passes per tab change. |
| Trigger document action menu | 18 cards re-rendered / 33.2 ms | 1 card re-rendered / 6.4 ms | Memoised `DocumentCardItem` confines updates to the active row. |
| Loading skeleton | Fresh array allocation each paint | Reused constant array | Eliminates GC churn while spinner is visible. |

**Key fixes**
- `DocumentCardItem` memoises per-row UI and signature counts; the parent list simply maps state.
- Status/type metadata & skeleton index arrays hoisted, removing per-render allocations.
- Tabs now reuse shared `DocumentListFilters` constants so `useEffect` no longer detects a “new” filter object on every render.

## Layout Provider Split
- React Query previously wrapped the entire `<html>` tree, so cache writes triggered header/footer re-renders (1.8 ms noise per query settle).
- Provider now scopes to `<main>` content; header, footer, toasts, and analytics remain static during cache churn, eliminating the extra commit observed during document filtering.
