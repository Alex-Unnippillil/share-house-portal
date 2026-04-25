import { afterEach, describe, expect, it, vi } from "vitest"

import { createAmenityBooking } from "@/lib/calcom-service"

describe("Cal.com booking integration payloads", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("maps amenity booking input into Cal.com create booking payload", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            eventTypes: [{ id: 22, title: "Kitchen Shared", hidden: false }],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ booking: { id: 987, url: "https://cal.test/booking/987" } }),
          { status: 200 }
        )
      ) as typeof fetch

    const result = await createAmenityBooking({
      amenityType: "Kitchen",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      userEmail: "tenant@example.com",
      userName: "Ava Tenant",
    })

    expect(result).toEqual({
      success: true,
      bookingId: "987",
      bookingUrl: "https://cal.test/booking/987",
    })

    const [, bookingCall] = vi.mocked(global.fetch).mock.calls
    const bookingPayload = JSON.parse(String(bookingCall?.[1]?.body))
    expect(bookingPayload).toMatchObject({
      eventTypeId: 22,
      title: "Kitchen - Ava Tenant",
    })
  })

  it("returns a user-facing conflict message when no amenity event type is available", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventTypes: [] }), { status: 200 })) as typeof fetch

    const result = await createAmenityBooking({
      amenityType: "PlayStation",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      userEmail: "tenant@example.com",
      userName: "Ava Tenant",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("No booking slot available for PlayStation")
  })

  it("retries transient 5xx responses for event type lookup with bounded attempts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary", { status: 503, statusText: "Service Unavailable" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventTypes: [] }), { status: 200 })) as typeof fetch

    global.fetch = fetchMock

    await createAmenityBooking({
      amenityType: "Kitchen",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      userEmail: "tenant@example.com",
      userName: "Ava Tenant",
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("returns outage message after bounded retries on booking timeouts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            eventTypes: [{ id: 22, title: "Kitchen Shared", hidden: false }],
          }),
          { status: 200 }
        )
      )
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout")) as typeof fetch

    global.fetch = fetchMock

    const result = await createAmenityBooking({
      amenityType: "Kitchen",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      userEmail: "tenant@example.com",
      userName: "Ava Tenant",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("temporarily degraded")
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

})
