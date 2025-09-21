"use client"

import EventEmitter from "eventemitter3"

export type NotificationType = "message:new" | "message:moderated" | "maintenance:update"

export type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  description?: string
  createdAt: string
  link?: string
  status?: string
  threadId?: string
  messageId?: string
  metadata?: Record<string, unknown>
}

const STORAGE_KEY = "share-house-notifications"
const emitter = new EventEmitter<{ update: NotificationItem[] }>()
let items: NotificationItem[] = []

const loadFromStorage = () => {
  if (typeof window === "undefined") {
    return
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as NotificationItem[]
      if (Array.isArray(parsed)) {
        items = parsed
      }
    }
  } catch (error) {
    console.error("Failed to load notifications", error)
  }
}

const persist = () => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)))
    } catch (error) {
      console.error("Failed to persist notifications", error)
    }
  }
  emitter.emit("update", [...items])
}

if (typeof window !== "undefined") {
  loadFromStorage()
}

export const getNotifications = (): NotificationItem[] => [...items]

export const pushNotification = (notification: NotificationItem) => {
  const existingIndex = items.findIndex((item) => item.id === notification.id)
  if (existingIndex >= 0) {
    items[existingIndex] = { ...items[existingIndex], ...notification }
  } else {
    items = [notification, ...items]
  }
  persist()
}

export const acknowledgeNotification = (id: string) => {
  const next = items.filter((notification) => notification.id !== id)
  if (next.length !== items.length) {
    items = next
    persist()
  }
}

export const subscribeNotifications = (
  listener: (notifications: NotificationItem[]) => void
) => {
  emitter.on("update", listener)
  return () => emitter.off("update", listener)
}

export const hydrateNotifications = (notifications: NotificationItem[]) => {
  items = notifications
  persist()
}
