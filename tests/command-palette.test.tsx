import React from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CommandPalette,
  type CommandPaletteNavItem,
  type QuickAction,
} from "@/components/navigation/CommandPalette"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe("CommandPalette", () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("navigates to a route using keyboard selection", async () => {
    const user = userEvent.setup()
    const navItems: CommandPaletteNavItem[] = [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Payments", href: "/payments" },
      { title: "Documents", href: "/documents" },
    ]

    render(<CommandPalette navItems={navItems} quickActions={[]} />)

    await user.keyboard("{Control>}k{/Control}")
    const input = await screen.findByPlaceholderText(/search for pages and quick actions/i)
    await user.type(input, "pay")
    await user.keyboard("{Enter}")

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/payments"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("executes a quick action via keyboard", async () => {
    const user = userEvent.setup()
    const actionHandler = vi.fn()
    const quickActions: QuickAction[] = [
      {
        id: "notify-roommates",
        label: "Notify roommates",
        description: "Send a quick update to the shared feed.",
        perform: actionHandler,
      },
    ]

    render(<CommandPalette navItems={[]} quickActions={quickActions} />)

    await user.keyboard("{Control>}k{/Control}")
    const input = await screen.findByPlaceholderText(/search for pages and quick actions/i)
    await user.type(input, "notify")
    await user.keyboard("{Enter}")

    await waitFor(() => expect(actionHandler).toHaveBeenCalledTimes(1))
    expect(pushMock).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
})
