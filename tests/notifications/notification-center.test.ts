import { describe, expect, it } from "vitest"

import {
  groupNotifications,
  resolveNotificationThreadId,
  shouldDisplayNotificationToast,
  type NotificationItem,
} from "@/components/notifications/notification-center"

describe("notification center helpers", () => {
  const baseNotification: NotificationItem = {
    id: "1",
    title: "New message",
    message: "Something happened",
    type: "info",
    read: false,
    created_at: "2024-01-01T00:00:00.000Z",
  }

  it("suppresses toast notifications for muted threads", () => {
    const notification: NotificationItem = {
      ...baseNotification,
      id: "toast-1",
      thread_id: "maintenance-thread",
    }

    const muted = { "maintenance-thread": true }

    expect(shouldDisplayNotificationToast(notification, muted)).toBe(false)
    expect(shouldDisplayNotificationToast(notification, {})).toBe(true)
  })

  it("groups notifications by thread and orders by latest activity", () => {
    const notifications: NotificationItem[] = [
      {
        ...baseNotification,
        id: "alpha-1",
        thread_id: "alpha",
        metadata: { context: "Alpha" },
        created_at: "2024-01-02T08:00:00.000Z",
      },
      {
        ...baseNotification,
        id: "alpha-2",
        thread_id: "alpha",
        metadata: { context: "Alpha" },
        created_at: "2024-01-03T08:00:00.000Z",
        read: true,
      },
      {
        ...baseNotification,
        id: "beta-1",
        thread_id: "beta",
        metadata: { context: "Beta" },
        created_at: "2024-01-04T08:00:00.000Z",
      },
      {
        ...baseNotification,
        id: "solo-1",
        title: "Solo alert",
        message: "Solo thread",
        metadata: null,
        thread_id: null,
        created_at: "2024-01-01T08:00:00.000Z",
      },
    ]

    const groups = groupNotifications(notifications)

    expect(groups).toHaveLength(3)
    expect(groups[0].id).toBe("beta")
    expect(groups[0].unreadCount).toBe(1)
    expect(groups[1].id).toBe("alpha")
    expect(groups[1].unreadCount).toBe(1)
    expect(groups[1].notifications[0].id).toBe("alpha-2")
    expect(groups[1].notifications[1].id).toBe("alpha-1")

    const soloGroup = groups.find(group => group.id === "solo-1")
    expect(soloGroup).toBeDefined()
    expect(soloGroup?.label).toBe("Solo alert")
  })

  it("falls back to notification id when deriving thread identifiers", () => {
    const notification: NotificationItem = {
      ...baseNotification,
      id: "context-only",
      thread_id: null,
      metadata: { extra: true },
    }

    expect(resolveNotificationThreadId(notification)).toBe("context-only")
  })
})
