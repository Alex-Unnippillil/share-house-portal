# Offline mutation strategy

The tenant portal now ships with a service worker (`/sw.js`) that keeps write
operations resilient when a device briefly drops offline. The worker focuses on
`POST`, `PUT`, `PATCH`, and `DELETE` requests that target same-origin APIs and
persists them until connectivity returns.

## Request lifecycle

1. **Intercept** – mutation requests are intercepted in the `fetch` handler.
   The worker attempts to forward them normally first.
2. **Queue** – if the network request throws (e.g. the browser is offline), the
   request is serialized and stored in IndexedDB (`share-house-portal-offline` →
   `mutation-queue`). Each entry includes the URL, method, headers, body
   (stored as an `ArrayBuffer`), credentials mode, and a timestamp for FIFO
   processing.
3. **Acknowledge** – the worker immediately responds with `202 Accepted` so the
   calling UI can continue without surfacing an error to the tenant.
4. **Notify** – a `postMessage` is sent to every controlled client so the React
   app can surface a toast that the action has been queued.

## Retrying queued mutations

- The queue is processed whenever the service worker activates, receives an
  `ONLINE` or `PROCESS_QUEUE` message, or when a background sync event fires for
  the `share-house-portal-sync` tag.
- Requests are replayed in chronological order. Successful responses delete the
  entry and broadcast a `MUTATION_SENT` message to the UI.
- Failures broadcast `MUTATION_ERROR` and leave the item in the queue so the
  next online event can retry. (Only the first failing entry stops the loop to
  avoid hammering the backend.)

## Toast feedback in the UI

The new `ServiceWorkerManager` client component registers the worker, listens
for messages, and shows contextual toasts via the shared toast system:

- **Queued** → “You are offline. We will retry this request…”.
- **Synced** → “Request synced successfully”.
- **Error** → Destructive toast describing the failure and confirming another
  retry will be attempted.

The component also listens to the browser `online` event and proactively
notifies the worker so queued requests flush as soon as connectivity returns.

## Storage considerations

- IndexedDB is preferred for reliability, larger payloads, and because service
  workers cannot access `localStorage`.
- The queue uses a dedicated object store keyed by a UUID generated in the
  worker.
- Bodies are persisted as binary data to preserve arbitrary payload types.

## Extending the strategy

- Add a `x-offline-queue: skip` request header and update `shouldHandleRequest`
  if certain endpoints should never be queued (e.g. analytics beacons).
- If mutations need bespoke success handling, extend the `broadcastMessage`
  payload to include identifiers that client components can hook into.
- Additional retry triggers (such as a manual “Sync now” button) can send a
  `PROCESS_QUEUE` message to `navigator.serviceWorker.controller`.

## Observability & debugging

- All queue operations log to the service worker console; use DevTools →
  Application → Service Workers to inspect IndexedDB contents.
- Because queued responses return `202`, client code should check for the
  `queued` flag in JSON responses if it needs to differentiate between immediate
  success and deferred execution.
