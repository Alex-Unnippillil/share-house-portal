import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HelpPanel } from "@/components/help/help-panel"

const routeState = vi.hoisted(() => ({ current: "/dashboard" }))
const trackSpy = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  usePathname: () => routeState.current,
}))

vi.mock("@vercel/analytics/react", () => ({
  track: (...args: unknown[]) => trackSpy(...args),
}))

describe("HelpPanel", () => {
  beforeEach(() => {
    routeState.current = "/dashboard"
    trackSpy.mockClear()
  })

  it("opens and closes the panel when toggled", async () => {
    const user = userEvent.setup()
    render(<HelpPanel />)

    const trigger = screen.getByRole("button", { name: /open help panel/i })
    await user.click(trigger)

    expect(await screen.findByText(/need a hand\?/i)).toBeInTheDocument()

    const closeButton = screen.getByRole("button", { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText(/need a hand\?/i)).not.toBeInTheDocument()
    })
  })

  it("filters help content based on the current route", async () => {
    routeState.current = "/payments"
    const user = userEvent.setup()
    render(<HelpPanel />)

    await user.click(screen.getByRole("button", { name: /open help panel/i }))

    expect(await screen.findByText("Automate rent reminders")).toBeInTheDocument()
    expect(screen.queryByText("Dashboard quickstart")).not.toBeInTheDocument()
  })

  it("tracks resource views only once per item", async () => {
    const user = userEvent.setup()
    render(<HelpPanel />)

    await user.click(screen.getByRole("button", { name: /open help panel/i }))
    trackSpy.mockClear()

    const docLink = await screen.findByRole("link", { name: /dashboard quickstart/i })

    await user.click(docLink)
    expect(trackSpy).toHaveBeenCalledTimes(1)
    expect(trackSpy).toHaveBeenCalledWith(
      "help_panel_resource_viewed",
      expect.objectContaining({
        route: "dashboard",
        resourceId: "dashboard-overview",
        resourceType: "doc",
      })
    )

    await user.click(docLink)
    expect(trackSpy).toHaveBeenCalledTimes(1)
  })
})
