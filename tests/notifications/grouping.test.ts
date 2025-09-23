import { describe, expect, it } from "vitest"

import {
  buildNotificationGroups,
  type NotificationRow,
  type ThreadPreferenceSummary,
} from "@/lib/notifications/thread-utils"

describe("notification grouping", () => {
  it("groups notifications by thread and applies mute preferences", () => {
    const notifications: NotificationRow[] = [
      {
        id: "n1",
        user_id: "user-1",
        title: "Payment posted",
        message: "Your rent payment cleared.",
        type: "success",
        action_url: "/payments",
        metadata: null,
        read: false,
        created_at: "2025-03-15T12:00:00.000Z",
        updated_at: "2025-03-15T12:00:00.000Z",
        thread_id: "payments",
        source: "payments",
        thread_label: "Payments",
      },
      {
        id: "n2",
        user_id: "user-1",
        title: "Earlier receipt",
        message: "Thanks for paying on time!",
        type: "info",
        action_url: null,
        metadata: null,
        read: true,
        created_at: "2025-03-14T09:00:00.000Z",
        updated_at: "2025-03-14T09:00:00.000Z",
        thread_id: "payments",
        source: "payments",
        thread_label: "Payments",
      },
      {
        id: "n3",
        user_id: "user-1",
        title: "Maintenance update",
        message: "The leaky sink fix is scheduled.",
        type: "warning",
        action_url: "/maintenance",
        metadata: { threadLabel: "Maintenance" },
        read: false,
        created_at: "2025-03-16T08:30:00.000Z",
        updated_at: "2025-03-16T08:30:00.000Z",
        thread_id: "maintenance-requests",
        source: "maintenance",
        thread_label: null,
      },
    ]

    const preferences: ThreadPreferenceSummary[] = [
      {
        thread_id: "maintenance-requests",
        muted: true,
        source: "maintenance",
        thread_label: "Maintenance",
      },
    ]

    const groups = buildNotificationGroups(notifications, preferences)

    expect(groups).toHaveLength(2)

    expect(groups[0].threadId).toBe("maintenance-requests")
    expect(groups[0].muted).toBe(true)
    expect(groups[0].unreadCount).toBe(1)
    expect(groups[0].notifications[0].id).toBe("n3")

    expect(groups[1].threadId).toBe("payments")
    expect(groups[1].muted).toBe(false)
    expect(groups[1].unreadCount).toBe(1)
    expect(groups[1].notifications.map((entry) => entry.id)).toEqual(["n1", "n2"])
  })

  it("derives human-friendly labels when none are supplied", () => {
    const notifications: NotificationRow[] = [
      {
        id: "n4",
        user_id: "user-2",
        title: "Guest arrival",
        message: "Alex arrives tomorrow night.",
        type: "info",
        action_url: "/visitors",
        metadata: null,
        read: false,
        created_at: "2025-03-10T18:45:00.000Z",
        updated_at: "2025-03-10T18:45:00.000Z",
        thread_id: "visitor-thread",
        source: "visitor-updates",
        thread_label: null,
      },
    ]

    const groups = buildNotificationGroups(notifications, [])

    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("Visitor Updates")
    expect(groups[0].muted).toBe(false)
  })
})
