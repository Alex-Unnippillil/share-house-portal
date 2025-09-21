import React from "react"
import { act, render, waitFor, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Database } from "@/lib/supabase"
import { AmenitiesClient } from "@/app/dashboard/amenities/_components/amenities-client"

const toastMock = vi.hoisted(() => vi.fn())
const getCalApiMock = vi.hoisted(() => vi.fn())
const listeners = vi.hoisted(() => new Map<string, (event: any) => void>())
const calHandler = vi.hoisted(() =>
  vi.fn((action: string, payload: any) => {
    if (action === "on") {
      listeners.set(payload.action, payload.callback)
      return
    }
    if (action === "off") {
      listeners.delete(payload.action)
      return
    }
  })
)

vi.mock("@/components/ui/use-toast", () => ({
  toast: toastMock,
}))

vi.mock("@calcom/embed-react", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: (props: any) => React.createElement("div", { "data-testid": "cal-embed", ...props }),
    getCalApi: getCalApiMock,
  }
})

type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"]

const originalFetch = global.fetch

beforeEach(() => {
  listeners.clear()
  toastMock.mockReset()
  getCalApiMock.mockReset()
  calHandler.mockClear()
  getCalApiMock.mockResolvedValue(calHandler)
})

describe("AmenitiesClient integration", () => {
  const amenity: AmenityRow = {
    id: "amenity-1",
    name: "Kitchen",
    slug: "kitchen",
    description: null,
    calcom_event_slug: "share-house/kitchen",
    calcom_event_type_id: 1001,
    building_id: null,
    unit_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it("logs bookings when Cal.com emits a success event", async () => {
    const baseResponse = {
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    }
    const postResponse = {
      ok: true,
      json: () => Promise.resolve({ data: { id: "booking-1" } }),
    }

    const mock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(postResponse as Response)
      }
      return Promise.resolve(baseResponse as Response)
    })

    global.fetch = mock as unknown as typeof fetch

    render(<AmenitiesClient amenities={[amenity]} userId="tenant-1" />)

    await waitFor(() => expect(getCalApiMock).toHaveBeenCalled())

    const success = listeners.get("bookingSuccessfulV2")
    expect(success).toBeTypeOf("function")

    const event = {
      detail: {
        data: {
          uid: "remote-1",
          startTime: "2024-05-01T10:00:00.000Z",
          endTime: "2024-05-01T11:00:00.000Z",
          eventTypeId: amenity.calcom_event_type_id,
          status: "confirmed",
        },
      },
    }

    await act(async () => {
      await success?.(event)
    })

    const postCall = mock.mock.calls.find(([, init]) => init?.method === "POST")
    expect(postCall).toBeTruthy()
    const [, postInit] = postCall!
    expect(JSON.parse(postInit!.body as string)).toMatchObject({
      amenityId: amenity.id,
      booking: { uid: "remote-1" },
    })
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Booking confirmed" })
    )
  })

  it("surfaces conflict notes for the active amenity", async () => {
    const conflictNote = "Conflict detected for booking remote-2"
    const mock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { id: "booking" } }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "booking-2",
                amenity_id: amenity.id,
                tenant_id: "tenant-1",
                start_time: "2024-05-02T10:00:00.000Z",
                end_time: "2024-05-02T11:00:00.000Z",
                status: "confirmed",
                notes: conflictNote,
              },
            ],
          }),
      } as Response)
    })

    global.fetch = mock as unknown as typeof fetch

    render(<AmenitiesClient amenities={[amenity]} userId="tenant-1" />)

    await waitFor(() => expect(mock).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText(conflictNote)).toBeTruthy())
    expect(toastMock).not.toHaveBeenCalled()
  })
})

afterEach(() => {
  global.fetch = originalFetch
})
