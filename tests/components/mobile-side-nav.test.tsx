// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockPathname = "/dashboard"

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}))

vi.mock("@/app/(portal)/dashboard/components/SideNav", () => ({
  SideBar: ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Mock Sidebar Navigation">
      <button type="button" onClick={onNavigate}>
        Go to payments
      </button>
    </nav>
  ),
}))

import MobileSideNav from "@/app/(portal)/dashboard/components/MobileSideNav"

describe("MobileSideNav", () => {
  beforeEach(() => {
    mockPathname = "/dashboard"
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
      writable: true,
    })
  })

  it("opens from an accessible trigger button and closes on large breakpoint resize", async () => {
    const user = userEvent.setup()

    render(<MobileSideNav />)

    const trigger = screen.getByRole("button", { name: /open navigation menu/i })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")

    await user.click(trigger)
    expect(await screen.findByRole("dialog")).toBeInTheDocument()

    window.innerWidth = 1280
    window.dispatchEvent(new Event("resize"))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("closes on route changes and on sidebar navigation callback", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MobileSideNav />)

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /go to payments/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()

    mockPathname = "/payments"
    rerender(<MobileSideNav />)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("keeps keyboard focus within the sheet and restores focus on Escape", async () => {
    const user = userEvent.setup()
    render(<MobileSideNav />)

    const trigger = screen.getByRole("button", { name: /open navigation menu/i })
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog")
    const closeButton = within(dialog).getByRole("button", { name: /close/i })

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true)
    })

    expect(closeButton).toBeInTheDocument()

    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    })
  })
})
