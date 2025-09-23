import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { ShortcutsModal } from "@/components/shortcuts/shortcuts-modal"

const push = vi.fn()
const replace = vi.fn()
const prefetch = vi.fn()
const refresh = vi.fn()
const back = vi.fn()
const forward = vi.fn()
const setTheme = vi.fn()

let mockPathname = "/"
let mockResolvedTheme = "light"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace,
    prefetch,
    refresh,
    back,
    forward,
  }),
  usePathname: () => mockPathname,
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockResolvedTheme,
    resolvedTheme: mockResolvedTheme,
    setTheme,
  }),
}))

beforeEach(() => {
  mockPathname = "/"
  mockResolvedTheme = "light"
  push.mockClear()
  replace.mockClear()
  prefetch.mockClear()
  refresh.mockClear()
  back.mockClear()
  forward.mockClear()
  setTheme.mockClear()
})

describe("ShortcutsModal", () => {
  it("opens the modal when ? is pressed", async () => {
    render(<ShortcutsModal />)

    fireEvent.keyDown(window, { key: "?" })

    const dialog = await screen.findByRole("dialog", {
      name: /keyboard shortcuts/i,
    })

    expect(dialog).toBeInTheDocument()
  })

  it("moves focus to the modal close button when opened", async () => {
    render(<ShortcutsModal />)

    fireEvent.keyDown(window, { key: "?" })

    const closeButton = await screen.findByRole("button", { name: /close/i })

    await waitFor(() => {
      expect(closeButton).toHaveFocus()
    })
  })

  it("dispatches actions for each documented shortcut", () => {
    render(<ShortcutsModal />)

    fireEvent.keyDown(window, { key: "g" })
    fireEvent.keyDown(window, { key: "d" })
    expect(push).toHaveBeenCalledWith("/dashboard")

    push.mockClear()
    fireEvent.keyDown(window, { key: "g" })
    fireEvent.keyDown(window, { key: "b" })
    expect(push).toHaveBeenCalledWith("/bookings")

    push.mockClear()
    fireEvent.keyDown(window, { key: "g" })
    fireEvent.keyDown(window, { key: "m" })
    expect(push).toHaveBeenCalledWith("/messaging")

    fireEvent.keyDown(window, { key: "t" })
    expect(setTheme).toHaveBeenCalledWith("dark")
  })
})
