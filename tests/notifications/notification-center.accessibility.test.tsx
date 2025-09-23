import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { NotificationCenter } from "@/components/notifications/notification-center"

type MockNotification = {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  action_url?: string
  read: boolean
  created_at: string
}

const toastMock = vi.fn()

function createSupabaseMock() {
  let notificationsData: MockNotification[] = []
  const listeners = new Set<(payload: { new: MockNotification }) => void>()

  const from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(async () => ({
      data: notificationsData,
      error: null,
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }))

  const supabase = {
    from,
    channel: vi.fn(() => {
      const channel = {
        on: (
          _event: string,
          _filter: unknown,
          callback: (payload: { new: MockNotification }) => void,
        ) => {
          listeners.add(callback)
          return channel
        },
        subscribe: () => channel,
      }

      return channel
    }),
    removeChannel: vi.fn(() => {
      listeners.clear()
    }),
    __setNotifications(data: MockNotification[]) {
      notificationsData = data
    },
    __emitInsert(notification: MockNotification) {
      notificationsData = [notification, ...notificationsData]
      for (const listener of listeners) {
        listener({ new: notification })
      }
    },
    __reset() {
      notificationsData = []
      listeners.clear()
      from.mockClear()
    },
  }

  return supabase
}

const supabaseMock = createSupabaseMock()

vi.mock("@/utils/supabase-browser", () => ({
  createClient: () => supabaseMock,
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

const baseNotifications: MockNotification[] = [
  {
    id: "1",
    title: "Rent payment posted",
    message: "June rent share was processed successfully.",
    type: "success",
    read: false,
    created_at: new Date("2024-06-01T10:00:00Z").toISOString(),
  },
  {
    id: "2",
    title: "Maintenance scheduled",
    message: "Kitchen faucet repair is booked for tomorrow at 9 AM.",
    type: "info",
    read: false,
    created_at: new Date("2024-06-02T15:30:00Z").toISOString(),
  },
  {
    id: "3",
    title: "Visitor registration approved",
    message: "Your guest stay for this weekend is confirmed.",
    type: "success",
    read: true,
    created_at: new Date("2024-06-03T08:45:00Z").toISOString(),
  },
]

describe("NotificationCenter accessibility", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    toastMock.mockClear()
    supabaseMock.__reset()
    supabaseMock.__setNotifications([...baseNotifications])
  })

  it("provides keyboard navigation with focus trapping", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<NotificationCenter />)

    const trigger = screen.getByRole("button", { name: /open notifications/i })
    await user.click(trigger)

    const markAllButton = await screen.findByRole("button", {
      name: /mark all notifications as read/i,
    })

    await waitFor(() => {
      expect(document.activeElement).toBe(markAllButton)
    })

    const getActiveLabel = () => {
      const active = document.activeElement as HTMLElement | null
      if (!active) return ""
      return (
        active.getAttribute("aria-label") ?? active.textContent ?? ""
      ).toLowerCase()
    }

    await user.tab()
    await waitFor(() => {
      expect(getActiveLabel()).toContain("rent payment posted")
    })

    await user.tab({ shift: true })
    await waitFor(() => {
      expect(document.activeElement).toBe(markAllButton)
    })

    await user.tab()
    await waitFor(() => {
      expect(getActiveLabel()).toContain("rent payment posted")
    })

    await user.keyboard("{ArrowDown}")
    await waitFor(() => {
      expect(getActiveLabel()).toContain("maintenance scheduled")
    })

    await user.keyboard("{Home}")
    await waitFor(() => {
      expect(getActiveLabel()).toContain("rent payment posted")
    })

    await user.keyboard("{End}")
    await waitFor(() => {
      expect(getActiveLabel()).toContain("visitor registration approved")
    })

    await user.tab()
    const closeButton = screen.getByRole("button", { name: /close/i })
    const loopTarget = document.activeElement
    expect(loopTarget === markAllButton || loopTarget === closeButton).toBe(true)
  })

  it("announces new notifications via the live region", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<NotificationCenter />)

    const trigger = screen.getByRole("button", { name: /open notifications/i })
    await user.click(trigger)

    await screen.findAllByRole("listitem")

    const liveRegions = screen.getAllByRole("status")
    const liveRegion = liveRegions[liveRegions.length - 1]

    const newNotification: MockNotification = {
      id: "4",
      title: "Lease renewal ready",
      message: "Review and sign the updated lease agreement.",
      type: "warning",
      read: false,
      created_at: new Date("2024-06-04T12:15:00Z").toISOString(),
    }

    supabaseMock.__emitInsert(newNotification)

    await waitFor(() => {
      expect(liveRegion.textContent).toContain(
        "New warning notification: Lease renewal ready. Review and sign the updated lease agreement.",
      )
    })
  })
})
