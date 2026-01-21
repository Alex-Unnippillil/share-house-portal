# Realtime UI Throughput Strategy

This document explains how we keep Supabase realtime messaging responsive under load. The implementation currently ships in [`components/notifications/notification-center.tsx`](../../components/notifications/notification-center.tsx).

## 60 Hz client buffering

* Realtime callbacks enqueue payloads instead of mutating React state immediately. The queue is flushed on a 60 Hz cadence via `requestAnimationFrame`, giving React a predictable rhythm that aligns with the browser render loop.
* `flushQueue` applies every buffered change in one React state update so layout/paint happens at most once per frame even if Supabase delivers many events.
* The queue is cleared only after a flush completes which prevents the UI from thrashing when bursts arrive back-to-back.

## Coalescing sequential updates

* Events are indexed by notification id while in the queue. When multiple payloads target the same record before a frame boundary, only the latest one survives.
* Insert + update pairs collapse into a single change, so message feeds render the newest state without re-rendering intermediate drafts.
* Deletes short-circuit queued inserts/updates so a record that churns rapidly never hits the UI in a stale state.

## Monitoring dropped frames

* Every animation frame we measure the elapsed time since the previous flush. If we miss the 60 Hz budget and still have queued work, we emit a `realtime:frames-dropped` `CustomEvent` on `window` with details about the gap, queue depth, and cumulative drop count.
* In development we also log a console warning so engineers notice frame loss immediately.
* Observability hooks can listen for the custom event:

  ```ts
  window.addEventListener("realtime:frames-dropped", (event) => {
    const detail = (event as CustomEvent).detail;
    reportMetric("notifications.frames_dropped", detail);
  });
  ```

## Operational notes

* `fetchNotifications` still performs the initial load so the queue only handles live deltas.
* If the UI ever needs a different cadence (e.g. 30 Hz on underpowered devices) we can expose a setting that tweaks the `FLUSH_INTERVAL_MS` constant and reuses the same infrastructure.
