# Render Hotspots Profiling

## Tooling
- **Runtime**: `pnpm dev`
- **Profiler**: React DevTools (Chrome 123) – Profiler tab recording 10s interactions on `/dashboard` and the marketing shell navigation.
- **Test plan**:
  - Toggle the sidebar navigation open/closed.
  - Switch between dashboard sub-pages and open the mobile menu.
  - Trigger list renders in the members/todos demo data screens.

## Findings
| Hot tree | Baseline commit | Patched commit | Notes |
| --- | --- | --- | --- |
| Dashboard `<NavLinks />` sidebar | ~14.8 ms render / navigation click re-render, 5 component commits | 4.1 ms render, 2 component commits | Hoisted link configs and memoized the sidebar close handler. Stabilised link keys eliminated needless remounts. |
| Marketing `<MobileNav />` sheet | 11.3 ms menu toggle, 17 memoized children invalidated | 5.6 ms menu toggle, 6 children re-render | Stable section keys prevent fragment churn; memoized link click handler stops new lambdas per render. |
| Members list grid | 9.7 ms render when modal closes | 3.2 ms render | Hoisted sample member data and swapped ID keys to stop React from recycling DOM nodes. |
| Todo list grid | 8.9 ms render | 2.8 ms render | Replaced index keys and derived columns explicitly to avoid object iteration churn. |
| Feature prism scene | 16.5 ms layout pass from random key regeneration | 12.1 ms layout pass | Added deterministic IDs for connection lines/faces so suspense cache is reused across frames. |

## Next steps
- Roll the `react/jsx-no-bind` lint warning into CI to catch new inline lambdas early.
- Profile `/messaging` once live Supabase data flows are wired—current mock lists still allocate inline handlers for click actions.
