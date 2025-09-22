# Chore Schedule Expansion & Caching

This document explains how household chores are expanded from their RRULE definitions and cached for fast rendering in the UI.

## Overview

- Chore definitions live in the `public.chores` table (one row per recurring task).
- The server routine located at `lib/chores/schedule.ts` expands each chore's RRULE into concrete occurrences covering the next eight weeks.
- Expanded results are cached per unit/household with [`unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache) to avoid recomputing schedules on every request.
- The chores page (`app/chores/page.tsx`) consumes the pre-expanded schedule so the UI renders instantly without client-side hydration delays.

## Expansion Flow

1. `getChoreScheduleForUnit(unitId)` resolves a Supabase admin client (service role if available, otherwise anon key).
2. All active chores scoped to the given `household_id` are fetched.
3. Each chore's cadence is interpreted as either:
   - A literal RRULE string (optional `DTSTART` supported), or
   - A shorthand cadence (`daily`, `weekly`, `biweekly`, `monthly`, `one_time`).
4. RRULEs are expanded using the [`rrule`](https://github.com/jakubroztocil/rrule) package across a fixed window: _start of today → start of day eight weeks out_.
5. Occurrences are sorted chronologically and wrapped with metadata (points, title, cadence, canonical RRULE).

### Cache Envelope

Each cache entry serialises the following payload:

| Field | Description |
| --- | --- |
| `unitId` | The unit/household identifier used for expansion. |
| `rangeStart` / `rangeEnd` | ISO timestamps delimiting the eight-week window. |
| `generatedAt` | ISO timestamp of when the cache entry was produced. |
| `occurrences[]` | List of chore occurrences (id, dueAt, points, RRULE, etc.). |

The cache is memoised for one hour (`revalidate: 3600`) to balance freshness with compute cost. Tags are attached so specific units can be invalidated without flushing the global cache.

## Cache Keys & Tags

| Type | Format |
| --- | --- |
| Base key | `['chore-schedule', unitId]` |
| Global tag | `chore-schedule:all` |
| Unit tag | `chore-schedule:unit:<unitId>` |

These values live in `lib/chores/schedule.ts`. All cache operations should reuse the constants exported from that module rather than hard-coding strings elsewhere.

## Invalidation Hooks

Two helpers are exported for mutation flows:

- `revalidateChoreScheduleForUnit(unitId)` revalidates a single unit cache.
- `revalidateAllChoreSchedules()` clears every cached schedule.

Server actions under `app/chores/actions.ts` call these hooks after mutating chore definitions. The upsert action also revalidates the original unit when a chore is moved between households to avoid stale data in the source cache.

When wiring new chore management surfaces, call the relevant helper immediately after persisting changes to guarantee the schedule shown to tenants reflects the latest definition.

## Operational Notes

- Missing `SUPABASE_SERVICE_ROLE_KEY` falls back to the anon key, so ensure RLS policies allow read access for chores when relying on this mode.
- Expansion assumes RRULEs reference UTC timestamps. Non-UTC inputs are parsed but should be avoided to prevent timezone drift in the UI.
- The eight-week window is intentionally fixed; long-range projections should call the expansion routine directly with a wider horizon (future enhancement).
