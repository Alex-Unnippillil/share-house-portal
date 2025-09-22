/* eslint-disable no-restricted-globals */
const CACHE_VERSION = 'v1.0.0'
const APP_SHELL_CACHE = `roomsily-app-shell-${CACHE_VERSION}`
const STATIC_CACHE = `roomsily-static-${CACHE_VERSION}`
const FONT_CACHE = `roomsily-fonts-${CACHE_VERSION}`

const APP_SHELL_ASSETS = ['/', '/manifest.json']

const STATIC_ASSETS = [
  '/favicon.ico',
  '/favicon.svg',
  '/avatar.png',
  '/roomsily-og.svg',
  '/onyx.svg',
  '/next.svg',
  '/vercel.svg',
  '/og-image.jpg',
  '/opengraph-image.jpg',
  '/twitter-card.png',
  '/twitter-image.jpg',
  '/images/touch/homescreen48.png',
  '/images/touch/homescreen72.png',
  '/images/touch/homescreen96.png',
  '/images/touch/homescreen144.png',
  '/images/touch/homescreen168.png',
  '/images/touch/homescreen192.png',
]

const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
]

const OFFLINE_NAVIGATION_TIMEOUT = 800

const STATIC_PATHS = new Set([...APP_SHELL_ASSETS, ...STATIC_ASSETS])

async function precacheAssets() {
  const shellCache = await caches.open(APP_SHELL_CACHE)
  await shellCache.addAll(APP_SHELL_ASSETS)

  const staticCache = await caches.open(STATIC_CACHE)
  await staticCache.addAll(STATIC_ASSETS)

  if (FONT_ASSETS.length > 0) {
    const fontCache = await caches.open(FONT_CACHE)
    await Promise.all(
      FONT_ASSETS.map(async (url) => {
        try {
          const request = new Request(url, {
            mode: url.startsWith('http') ? 'no-cors' : 'cors',
            credentials: 'omit',
          })
          const response = await fetch(request)
          if (response) {
            await fontCache.put(request, response)
          }
        } catch (error) {
          console.warn('[service-worker] Failed to precache font asset', url, error)
        }
      }),
    )
  }
}

async function clearObsoleteCaches() {
  const expectedCaches = [APP_SHELL_CACHE, STATIC_CACHE, FONT_CACHE]
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map((cacheName) => {
      if (!expectedCaches.includes(cacheName)) {
        return caches.delete(cacheName)
      }
      return undefined
    }),
  )
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    return cached
  }

  const response = await fetch(request)
  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)

  if (cached) {
    return cached
  }

  return networkPromise
}

async function handleNavigationRequest(event) {
  const cache = await caches.open(APP_SHELL_CACHE)
  const { request } = event
  const cachedMatch =
    (await cache.match(request)) || (await cache.match('/', { ignoreSearch: true }))

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cachedMatch)

  if (cachedMatch) {
    const timeoutFallback = delay(OFFLINE_NAVIGATION_TIMEOUT).then(() => cachedMatch)
    return Promise.race([networkPromise, timeoutFallback]).then((response) => response || cachedMatch)
  }

  return networkPromise
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(precacheAssets())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await clearObsoleteCaches()
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event))
    return
  }

  const requestURL = new URL(request.url)

  if (STATIC_PATHS.has(requestURL.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  if (request.destination === 'font') {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  const data = event.data.json()
  const title = data.title || 'Roomsily'
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/images/touch/homescreen96.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || self.location.origin,
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 'notification',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetURL = event.notification?.data?.url || self.location.origin
  event.waitUntil(clients.openWindow(targetURL))
})
