# Offline experience

## Overview

The Roomsily portal now exposes a progressive web app shell that stays responsive even
when network connectivity is unreliable. The service worker precaches the assets that
form the primary UI, keeps mission-critical icons and fonts available locally, and
responds to navigation requests with a cached shell if the network is slow or
unavailable.

## Precaching strategy

- `app/sw.js` installs three versioned caches:
  - **App shell cache**: `/` and `/manifest.json` so that the core router and hydration
    entry point are always available.
  - **Static asset cache**: favicons, launch icons, marketing imagery, and other files
    under `public/` that are referenced in the manifest or metadata.
  - **Font cache**: Google font stylesheets for Inter and JetBrains Mono plus any
    runtime font requests that hit the service worker. Each cache name includes the
    `v1.0.0` suffix so updating the constant triggers a full refresh.
- During install the worker warms all three caches. Font fetches are wrapped in
  `Promise.all` so a transient failure to download a font does not break the install.

## Runtime behaviour

- Navigation requests use a network-first strategy with an **800&nbsp;ms timeout**. If
  the server is slow (e.g. 3G latency) or offline, the cached app shell is returned so
  the UI paints immediately.
- Requests for cached static assets fall back to `cache-first` reads, ensuring icons and
  manifest imagery always render offline.
- Fonts, scripts, styles, and images use a cache-first or stale-while-revalidate policy
  so the first successful request is stored for future offline sessions.
- Push notifications continue to display with offline-safe icons and badge assets.

## Update checks

`components/service-worker-manager.tsx` registers the worker from a client boundary in
`app/layout.tsx`. The registration layer:

- Skips registration in development to avoid caching dev bundles.
- Immediately calls `registration.update()` after installing the worker.
- Polls for updates every 30 minutes and whenever the document becomes visible.
- Logs to the console when a new worker is installed so product owners can prompt users
  to refresh.

## Testing the offline path

1. Build the app (`pnpm build`) and start it (`pnpm start`).
2. Load the site in Chrome, open DevTools, and confirm the service worker is active
   under Application → Service Workers.
3. Switch DevTools to **Offline** or **Fast 3G** throttling and refresh.
4. The home route should render within 800&nbsp;ms and the Network tab will show
   responses served from the `roomsily-app-shell-v1.0.0` and `roomsily-static-v1.0.0`
   caches.
5. Navigate between shallow routes; the shell stays interactive even without network
   connectivity, proving that the cached assets are used.
