/* eslint-disable no-undef */
// Load Workbox from the official CDN. This keeps the bundle lean while
// ensuring we always reference a version compatible with our dependencies.
self.importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js'
)

const OFFLINE_EVENT = 'OFFLINE_QUEUE_EVENT'

const flows = [
  {
    id: 'maintenance',
    match: (url) => url.pathname.startsWith('/api/maintenance'),
    queue: null,
  },
  {
    id: 'visitors',
    match: (url) => url.pathname.startsWith('/api/visitors'),
    queue: null,
  },
  {
    id: 'messaging',
    match: (url) => url.pathname.startsWith('/api/messaging'),
    queue: null,
  },
]

const broadcastToClients = async (message) => {
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of allClients) {
    client.postMessage(message)
  }
}

const ensureQueueForFlow = (flow) => {
  if (flow.queue) {
    return flow.queue
  }

  const queue = new workbox.backgroundSync.Queue(
    `${flow.id}-offline-queue`,
    {
      maxRetentionTime: 24 * 60,
      onSync: async ({ queue }) => {
        let request
        let replayed = 0

        await broadcastToClients({
          type: OFFLINE_EVENT,
          flow: flow.id,
          event: 'sync-start',
          timestamp: Date.now(),
        })

        while ((request = await queue.shiftRequest())) {
          try {
            await fetch(request.request)
            replayed += 1
          } catch (error) {
            await queue.unshiftRequest(request)
            await broadcastToClients({
              type: OFFLINE_EVENT,
              flow: flow.id,
              event: 'sync-error',
              error: error instanceof Error ? error.message : 'unknown_error',
              timestamp: Date.now(),
            })
            throw error
          }
        }

        if (replayed > 0) {
          await broadcastToClients({
            type: OFFLINE_EVENT,
            flow: flow.id,
            event: 'replayed',
            successCount: replayed,
            timestamp: Date.now(),
          })
        } else {
          await broadcastToClients({
            type: OFFLINE_EVENT,
            flow: flow.id,
            event: 'sync-complete',
            timestamp: Date.now(),
          })
        }
      },
    }
  )

  flow.queue = queue
  return queue
}

self.addEventListener('message', (event) => {
  const data = event.data

  if (!data || data.type !== 'OFFLINE_QUEUE_STATUS_REQUEST') {
    return
  }

  const flow = flows.find((entry) => entry.id === data.flow)
  if (!flow) {
    return
  }

  const queue = ensureQueueForFlow(flow)

  event.waitUntil(
    queue.getAll().then((entries) =>
      broadcastToClients({
        type: OFFLINE_EVENT,
        flow: flow.id,
        event: 'status',
        queuedCount: entries.length,
        timestamp: Date.now(),
      })
    )
  )
})

const registerOfflineRoute = (flow) => {
  const queue = ensureQueueForFlow(flow)

  workbox.routing.registerRoute(
    ({ request, url }) => request.method === 'POST' && flow.match(url),
    async ({ event }) => {
      try {
        return await fetch(event.request.clone())
      } catch (error) {
        await queue.pushRequest({ request: event.request })
        await broadcastToClients({
          type: OFFLINE_EVENT,
          flow: flow.id,
          event: 'queued',
          error: error instanceof Error ? error.message : 'network_error',
          timestamp: Date.now(),
        })

        return new Response(JSON.stringify({ queued: true }), {
          status: 202,
          headers: {
            'Content-Type': 'application/json',
            'X-Offline-Queued': '1',
            'X-Offline-Flow': flow.id,
          },
        })
      }
    },
    'POST'
  )
}

if (self.workbox) {
  workbox.core.skipWaiting()
  workbox.core.clientsClaim()

  for (const flow of flows) {
    registerOfflineRoute(flow)
  }
}

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(clients.openWindow('https://roomsily.app'))
})
