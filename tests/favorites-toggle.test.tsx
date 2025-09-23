import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import SmartLink from "@/components/navigation/SmartLink"
import { FavoritesProvider, useFavorites } from "@/components/navigation/FavoritesPanel"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
  }),
}))

type FavoriteResponse = {
  id: string
  entityType: string
  entityId: string
  sortOrder: number
  pinnedAt: string | null
  metadata?: { label?: string; href?: string }
}

type FavoritesPayload = {
  favorites: FavoriteResponse[]
}

const originalFetch = globalThis.fetch
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function ToggleHarness() {
  const { favorites } = useFavorites()

  return (
    <div>
      <SmartLink
        href="/payments"
        favorite={{
          entityType: "navigation",
          entityId: "/payments",
          metadata: { label: "Payments", href: "/payments" },
        }}
      >
        Payments
      </SmartLink>
      <ul data-testid="favorites-list">
        {favorites.map((favorite) => (
          <li key={favorite.id}>{favorite.metadata?.label ?? favorite.entityId}</li>
        ))}
      </ul>
    </div>
  )
}

function ReorderHarness() {
  const { favorites, reorderFavorites } = useFavorites()

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          reorderFavorites(
            favorites
              .map((favorite) => favorite.id)
              .slice()
              .reverse(),
          )
        }
      >
        Reverse order
      </button>
      <ol data-testid="favorites-order">
        {favorites.map((favorite) => (
          <li key={favorite.id}>{favorite.metadata?.label ?? favorite.entityId}</li>
        ))}
      </ol>
    </div>
  )
}

describe("favorites toggling", () => {
  it("adds a navigation link to favorites when pinned", async () => {
    const togglePayload: FavoritesPayload = {
      favorites: [
        {
          id: "fav-1",
          entityType: "navigation",
          entityId: "/payments",
          sortOrder: 1,
          pinnedAt: "2024-01-01T00:00:00.000Z",
          metadata: { label: "Payments", href: "/payments" },
        },
      ],
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ favorites: [] as FavoriteResponse[] }), {
        status: 200,
      }),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(togglePayload), { status: 200 }),
    )

    render(
      <FavoritesProvider>
        <ToggleHarness />
      </FavoritesProvider>,
    )

    const pinButton = await screen.findByRole("button", {
      name: /pin to favorites/i,
    })

    fireEvent.click(pinButton)

    const list = screen.getByTestId("favorites-list")
    await waitFor(() => {
      expect(within(list).getByText("Payments")).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reorders favorites and persists the new order", async () => {
    const initialFavorites: FavoritesPayload = {
      favorites: [
        {
          id: "fav-a",
          entityType: "navigation",
          entityId: "/alpha",
          sortOrder: 1,
          pinnedAt: "2024-01-01T00:00:00.000Z",
          metadata: { label: "Alpha", href: "/alpha" },
        },
        {
          id: "fav-b",
          entityType: "navigation",
          entityId: "/beta",
          sortOrder: 2,
          pinnedAt: "2024-01-02T00:00:00.000Z",
          metadata: { label: "Beta", href: "/beta" },
        },
      ],
    }

    const reorderedFavorites: FavoritesPayload = {
      favorites: [
        {
          ...initialFavorites.favorites[1],
          sortOrder: 1,
        },
        {
          ...initialFavorites.favorites[0],
          sortOrder: 2,
        },
      ],
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(initialFavorites), { status: 200 }),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(reorderedFavorites), { status: 200 }),
    )

    render(
      <FavoritesProvider>
        <ReorderHarness />
      </FavoritesProvider>,
    )

    const order = await screen.findByTestId("favorites-order")
    const initialOrder = within(order)
      .getAllByRole("listitem")
      .map((item) => item.textContent)
    expect(initialOrder).toEqual(["Alpha", "Beta"])

    fireEvent.click(screen.getByRole("button", { name: /reverse order/i }))

    await waitFor(() => {
      const updatedOrder = within(order)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
      expect(updatedOrder).toEqual(["Beta", "Alpha"])
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
