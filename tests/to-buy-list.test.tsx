import React from "react"
import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ToBuyList from "@/app/dashboard/supplies/components/to-buy-list"
import type { Database } from "@/lib/supabase"

const mocks = vi.hoisted(() => {
  const recordPurchaseActionMock = vi.fn()
  const reopenToBuyItemActionMock = vi.fn()
  const subscribeMock = vi.fn()
  const onMock = vi.fn()
  const channelMock = {
    on: onMock,
    subscribe: subscribeMock,
  }
  const removeChannelMock = vi.fn()
  const channelFactoryMock = vi.fn(() => channelMock)

  return {
    recordPurchaseActionMock,
    reopenToBuyItemActionMock,
    subscribeMock,
    onMock,
    channelMock,
    removeChannelMock,
    channelFactoryMock,
  }
})

vi.mock("@/app/dashboard/supplies/actions", () => ({
  recordPurchaseAction: mocks.recordPurchaseActionMock,
  reopenToBuyItemAction: mocks.reopenToBuyItemActionMock,
}))

let realtimeCallback: ((payload: any) => void) | undefined

vi.mock("@/utils/supabase-browser", () => ({
  default: () => ({
    channel: mocks.channelFactoryMock,
    removeChannel: mocks.removeChannelMock,
  }),
}))

type ToBuyItem = Database["public"]["Tables"]["to_buy_items"]["Row"]

describe("ToBuyList realtime updates", () => {
  beforeEach(() => {
    realtimeCallback = undefined
    mocks.subscribeMock.mockReset()
    mocks.subscribeMock.mockImplementation(() => mocks.channelMock)
    mocks.onMock.mockReset()
    mocks.onMock.mockImplementation((_event, _filter, callback) => {
      realtimeCallback = callback
      return mocks.channelMock
    })
    mocks.removeChannelMock.mockReset()
    mocks.channelFactoryMock.mockReset()
    mocks.channelFactoryMock.mockImplementation(() => mocks.channelMock)
    mocks.recordPurchaseActionMock.mockReset()
    mocks.reopenToBuyItemActionMock.mockReset()
  })

  it("reflects fulfillment events as soon as they arrive", async () => {
    const pendingItem: ToBuyItem = {
      id: "1",
      created_at: new Date("2024-05-01").toISOString(),
      name: "Paper towels",
      notes: null,
      quantity: 2,
      supply_item_id: "supply-1",
      fulfilled_at: null,
    }

    render(<ToBuyList initialItems={[pendingItem]} />)

    expect(await screen.findByText(/Needs purchase/i)).toBeInTheDocument()
    expect(realtimeCallback).toBeTypeOf("function")

    const fulfilled = {
      ...pendingItem,
      fulfilled_at: new Date("2024-05-02T15:00:00Z").toISOString(),
    }

    await act(async () => {
      realtimeCallback?.({
        eventType: "UPDATE",
        new: fulfilled,
        old: pendingItem,
        schema: "public",
        table: "to_buy_items",
        commit_timestamp: fulfilled.fulfilled_at,
      })
    })

    expect(screen.getByText(/Fulfilled/)).toBeInTheDocument()
  })

  it("adds new items when realtime inserts occur", async () => {
    render(<ToBuyList initialItems={[]} />)

    expect(await screen.findByText(/fully stocked/i)).toBeInTheDocument()
    expect(realtimeCallback).toBeTypeOf("function")

    const inserted: ToBuyItem = {
      id: "2",
      created_at: new Date("2024-05-03T09:00:00Z").toISOString(),
      name: "Dish soap",
      notes: "Unscented",
      quantity: 1,
      supply_item_id: "supply-2",
      fulfilled_at: null,
    }

    await act(async () => {
      realtimeCallback?.({
        eventType: "INSERT",
        new: inserted,
        old: null,
        schema: "public",
        table: "to_buy_items",
        commit_timestamp: inserted.created_at,
      })
    })

    expect(await screen.findByText(/Dish soap/)).toBeInTheDocument()
    expect(screen.getByText(/Needs purchase/)).toBeInTheDocument()
  })
})
