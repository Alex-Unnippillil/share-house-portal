"use client"

import { useMemo } from "react"
import { useSyncExternalStore } from "react"

import {
  clearNotifications,
  getNotificationsSnapshot,
  subscribeToNotifications,
  type NotificationDomain,
  type NotificationPayload,
} from "@/lib/notifications"

export function useNotifications(domain?: NotificationDomain) {
  const subscribe = useMemo(
    () =>
      (callback: () => void) => {
        const unsubscribe = subscribeToNotifications(callback)
        return () => unsubscribe()
      },
    [],
  )

  const getSnapshot = useMemo(
    () => () => getNotificationsSnapshot(domain),
    [domain],
  )

  const notifications = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    notifications,
    clear: () => clearNotifications(domain),
  }
}

export type { NotificationPayload }
