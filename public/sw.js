/* eslint-disable no-restricted-globals */
const DEFAULT_TITLE = "Roomsily update"
const DEFAULT_ICON = "/images/touch/homescreen192.png"
const DEFAULT_BADGE = "/images/touch/homescreen96.png"

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  if (!event.data) {
    return
  }

  let payload
  try {
    payload = event.data.json()
  } catch (_error) {
    payload = {
      title: DEFAULT_TITLE,
      body: event.data.text(),
    }
  }

  const title = typeof payload.title === "string" ? payload.title : DEFAULT_TITLE
  const body = typeof payload.body === "string" ? payload.body : ""
  const icon = typeof payload.icon === "string" ? payload.icon : DEFAULT_ICON
  const badge = typeof payload.badge === "string" ? payload.badge : DEFAULT_BADGE
  const url = typeof payload.url === "string" ? payload.url : undefined

  const options = {
    body,
    icon,
    badge,
    data: {
      url,
      timestamp: Date.now(),
      ...((payload === null || typeof payload !== "object") ? null : payload.data),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url

  if (!targetUrl) {
    return
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => "url" in client && client.url === targetUrl)

      if (existingClient && "focus" in existingClient) {
        return existingClient.focus()
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    })
  )
})

self.addEventListener("notificationclose", (event) => {
  const loggable = {
    action: "notification-close",
    url: event.notification?.data?.url,
    timestamp: Date.now(),
  }
  if (self && "console" in self && typeof self.console?.debug === "function") {
    self.console.debug("Notification closed", loggable)
  }
})

self.addEventListener("pushsubscriptionchange", (event) => {
  if (!event.oldSubscription && !event.newSubscription) {
    return
  }

  event.waitUntil(
    (async () => {
      try {
        const response = await fetch("/api/notifications/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription?.endpoint,
            newEndpoint: event.newSubscription?.endpoint,
          }),
        })
        if (!response.ok) {
          throw new Error(`Failed to persist subscription change: ${response.status}`)
        }
      } catch (error) {
        if (self && "console" in self && typeof self.console?.error === "function") {
          self.console.error("Subscription sync failed", error)
        }
      }
    })()
  )
})
