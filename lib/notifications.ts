export type NotificationDomain = "messages" | "maintenance" | "system"

export interface NotificationPayload {
  id: string
  domain: NotificationDomain
  title: string
  body: string
  createdAt: string
  link?: string
  metadata?: Record<string, unknown>
}

type Listener = () => void

const listeners = new Set<Listener>()
let notifications: NotificationPayload[] = []

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `notification-${Math.random().toString(36).slice(2, 12)}`
}

export function emitNotification(payload: Omit<NotificationPayload, "id" | "createdAt"> & {
  id?: string
  createdAt?: string
}) {
  const entry: NotificationPayload = {
    id: payload.id ?? generateId(),
    createdAt: payload.createdAt ?? new Date().toISOString(),
    ...payload,
  }

  notifications = [...notifications, entry]
  listeners.forEach((listener) => listener())

  return entry
}

export function subscribeToNotifications(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getNotificationsSnapshot(domain?: NotificationDomain) {
  if (!domain) {
    return notifications
  }

  return notifications.filter((notification) => notification.domain === domain)
}

export function clearNotifications(domain?: NotificationDomain) {
  if (!domain) {
    notifications = []
  } else {
    notifications = notifications.filter((notification) => notification.domain !== domain)
  }

  listeners.forEach((listener) => listener())
}
