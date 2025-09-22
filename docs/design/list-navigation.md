# List Navigation UX Guidelines

The messaging feed and in-app notification center now rely on numbered pagination instead of infinite scroll. This shift improves situational awareness for residents and makes the experience more respectful of accessibility constraints.

## Why we replaced infinite scroll

- **Predictable progress:** Cursor-based infinite feeds obscured how many messages or alerts remained. Numbered pages communicate scope and let users plan their catch-up sessions.
- **Better wayfinding:** Pagination provides durable URLs (`/messaging?page=2`) so roommates can resume discussions on the same slice of history without rescrolling.
- **Accessibility parity:** Screen reader users gain discrete navigation targets and can jump between pages without losing context, eliminating the endless landmark repetition that infinite scroll produced.

## Pagination behaviour

- **Page size:** Both experiences default to 10–12 items per page, balancing readability with the need to surface enough recent activity.
- **Quick jumps:** Each view exposes `First`, `Previous`, `Next`, `Last`, and a numeric "Jump to page" control for efficient traversal. The inputs clamp to the valid range to prevent error states.
- **Scroll memory:** We persist the scroll offset for every page. Returning to a previously visited page restores the exact viewport position so users never lose their place while auditing long histories.
- **Realtime inserts:** New notifications hydrate the first page, but do not displace the user if they are reviewing older pages. Analytics log a `realtime` pagination event so the data layer can distinguish passive inserts from explicit navigation.

## Analytics instrumentation

Pagination interactions emit `pagination_interaction` events via Vercel Analytics with the following payload:

```json
{
  "context": "messages" | "notifications",
  "page": <number>,
  "action": "first" | "previous" | "next" | "last" | "jump" | "realtime",
  "pageSize": <number>,
  "totalItems": <number>,
  "totalPages": <number>
}
```

These events unlock funnel analysis (e.g., how many roommates skim past page one) and correlate scroll retention with follow-up actions such as marking items read.

## Resilience considerations

- When Supabase is unreachable we fall back to cached sample data and surface a subtle inline warning. Pagination controls remain fully functional so QA and demos are never blocked.
- Scroll restoration is disabled server-side to avoid mismatched hydration in Next.js; all persistence runs in the browser and only activates when a user triggers pagination.
- All destructive actions (delete, mark read) recompute pagination metadata so page counts stay accurate without requiring a hard refresh.
