self.addEventListener('push', (event) => {
  const payload = event.data?.json()

  if (!payload) {
    return
  }

  const scope = self.registration?.scope ?? '/'
  const title = payload.title ?? 'Share House Portal'

  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/images/touch/homescreen192.png',
    badge: payload.badge ?? '/images/touch/homescreen48.png',
    vibrate: payload.vibrate ?? [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: payload.data?.primaryKey ?? 'notification',
      url: payload.url ?? payload.data?.url ?? scope,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl =
    event.notification?.data?.url ?? self.registration?.scope ?? '/'

  event.waitUntil(clients.openWindow(targetUrl))
})
