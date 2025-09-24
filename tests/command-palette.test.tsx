import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const pushMock = vi.fn()
const setThemeMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: setThemeMock,
  }),
}))

let CommandPalette: typeof import("@/components/navigation/CommandPalette").CommandPalette

beforeAll(async () => {
  ;({ CommandPalette } = await import("@/components/navigation/CommandPalette"))
})

beforeEach(() => {
  pushMock.mockClear()
  setThemeMock.mockClear()
})

describe("CommandPalette", () => {
  it("navigates to the selected route using keyboard search", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    fireEvent.keyDown(document, { key: "k", metaKey: true })

    const input = await screen.findByPlaceholderText(
      /search for pages and quick actions/i
    )

    await user.type(input, "payments")
    await user.keyboard("{ArrowDown}{Enter}")

    expect(pushMock).toHaveBeenCalledWith("/payments")
  })

  it("executes quick actions selected via keyboard", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    fireEvent.keyDown(document, { key: "k", ctrlKey: true })

    const input = await screen.findByPlaceholderText(
      /search for pages and quick actions/i
    )

    await user.type(input, "theme")
    await user.keyboard("{Enter}")

    expect(setThemeMock).toHaveBeenCalledWith("dark")
  })
})
