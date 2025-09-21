"use client"

import { useEffect, useState } from "react"

import {
  getNotifications,
  subscribeNotifications,
  type NotificationItem,
} from "@/lib/notifications/store"

export const useNotificationFeed = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    getNotifications()
  )

  useEffect(() => {
    setNotifications(getNotifications())
    const unsubscribe = subscribeNotifications((items) => setNotifications(items))
    return () => unsubscribe()
  }, [])

  return notifications
}
