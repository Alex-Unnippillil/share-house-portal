// @vitest-environment jsdom

import React, { useEffect } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { CommandPaletteProvider, useCommandPalette } from "@/components/navigation/CommandPalette"

const pushMock = vi.fn()
const prefetchMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    prefetch: prefetchMock,
  }),
  usePathname: () => "/dashboard",
}))

const { searchDocumentsMock, searchBookingsMock } = vi.hoisted(() => ({
  searchDocumentsMock: vi.fn(),
  searchBookingsMock: vi.fn(),
}))

vi.mock("@/lib/navigation/command-palette", () => ({
  searchDocumentsForCommandPalette: searchDocumentsMock,
  searchBookingsForCommandPalette: searchBookingsMock,
}))

const supabaseStub = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock("@/utils/supabase-browser", () => ({
  __esModule: true,
  default: () => supabaseStub,
  createClient: () => supabaseStub,
}))

function PaletteObserver({ onOpen }: { onOpen: (open: boolean) => void }) {
  const { open } = useCommandPalette()

  useEffect(() => {
    onOpen(open)
  }, [onOpen, open])

  return null
}

describe("CommandPalette", () => {
  beforeEach(() => {
    pushMock.mockReset()
    prefetchMock.mockReset()
    prefetchMock.mockResolvedValue(undefined)
    searchDocumentsMock.mockReset()
    searchBookingsMock.mockReset()
    searchDocumentsMock.mockResolvedValue([])
    searchBookingsMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("opens via keyboard shortcut and triggers a debounced search", async () => {
    const user = userEvent.setup()

    const states: boolean[] = []

    render(
      <CommandPaletteProvider>
        <PaletteObserver onOpen={(value) => states.push(value)} />
        <div />
      </CommandPaletteProvider>,
    )

    await act(async () => {
      await user.keyboard("{Control>}k{/Control}")
    })
    await waitFor(() => {
      expect(states.at(-1)).toBe(true)
    })

    const input = screen.getByRole("combobox")
    await user.type(input, "doc")

    await new Promise((resolve) => setTimeout(resolve, 300))

    await waitFor(() => {
      expect(searchDocumentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ query: "doc" }),
      )
    })
    expect(searchBookingsMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: "doc" }),
    )
  })

  it("navigates to a search result using keyboard selection", async () => {
    const user = userEvent.setup()

    const states: boolean[] = []

    searchDocumentsMock.mockResolvedValueOnce([
      {
        id: "doc-1",
        href: "/documents?documentId=doc-1",
        title: "Lease Agreement",
        subtitle: "Lease • Signed",
        type: "document",
      },
    ])

    render(
      <CommandPaletteProvider>
        <PaletteObserver onOpen={(value) => states.push(value)} />
        <div />
      </CommandPaletteProvider>,
    )

    await act(async () => {
      await user.keyboard("{Control>}k{/Control}")
    })
    await waitFor(() => {
      expect(states.at(-1)).toBe(true)
    })
    const input = screen.getByRole("combobox")
    await user.type(input, "lease")
    expect((input as HTMLInputElement).value).toBe("lease")

    await new Promise((resolve) => setTimeout(resolve, 300))

    await waitFor(() => {
      expect(searchDocumentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ query: "lease" }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText("Lease Agreement")).toBeInTheDocument()
    })

    await act(async () => {
      await user.keyboard("{ArrowDown}")
    })

    await act(async () => {
      await user.keyboard("{Enter}")
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/documents?documentId=doc-1")
    })
    await waitFor(() => {
      expect(states.at(-1)).toBe(false)
    })
  })

  it("executes quick action hotkeys in two keystrokes", async () => {
    const user = userEvent.setup()

    render(
      <CommandPaletteProvider>
        <div />
      </CommandPaletteProvider>,
    )

    await act(async () => {
      await user.keyboard("{Control>}i{/Control}")
    })

    expect(pushMock).toHaveBeenCalledWith("/onboarding?flow=invite-roommate")
  })
})
