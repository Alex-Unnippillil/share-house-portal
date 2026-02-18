// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SidebarProvider, useSidebar } from "@/lib/hooks/use-sidebar"

function SidebarHarness() {
  const { isSidebarOpen, toggleSidebar } = useSidebar()

  return (
    <div>
      <p data-testid="sidebar-state">{isSidebarOpen ? "open" : "closed"}</p>
      <button onClick={toggleSidebar} type="button">
        Toggle sidebar
      </button>
    </div>
  )
}

describe("SidebarProvider", () => {
  it("hydrates from localStorage and persists toggles", async () => {
    localStorage.setItem("sidebar", JSON.stringify(false))

    render(
      <SidebarProvider>
        <SidebarHarness />
      </SidebarProvider>
    )

    expect(await screen.findByTestId("sidebar-state")).toHaveTextContent("closed")

    await userEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }))

    expect(screen.getByTestId("sidebar-state")).toHaveTextContent("open")
    expect(localStorage.getItem("sidebar")).toBe("true")
  })
})
