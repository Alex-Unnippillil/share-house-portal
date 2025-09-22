import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/bookings/request/route"

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}))

describe("POST /api/bookings/request", () => {
  let getUserMock: ReturnType<typeof vi.fn>
  let singleMock: ReturnType<typeof vi.fn>
  let insertMock: ReturnType<typeof vi.fn>
  let selectMock: ReturnType<typeof vi.fn>
  let fromMock: ReturnType<typeof vi.fn>

  const buildRequest = (body: Record<string, unknown> = {}) =>
    new Request("http://localhost/api/bookings/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amenityId: "kitchen",
        unitId: "unit-101",
        startsAt: "2024-01-01T10:00:00.000Z",
        endsAt: "2024-01-01T11:00:00.000Z",
        ...body,
      }),
    })

  beforeEach(() => {
    getUserMock = vi.fn()
    singleMock = vi.fn()
    selectMock = vi.fn(() => ({ single: singleMock }))
    insertMock = vi.fn(() => ({ select: selectMock }))
    fromMock = vi.fn(() => ({ insert: insertMock }))

    createClientMock.mockReturnValue({
      auth: { getUser: getUserMock },
      from: fromMock,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("creates a booking for authenticated callers", async () => {
    const bookingRecord = { id: 42 }

    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } })
    singleMock.mockResolvedValue({ data: bookingRecord, error: null })

    const response = await POST(buildRequest())

    expect(response.status).toBe(201)
    const payload = await response.json()
    expect(payload).toEqual({ booking: bookingRecord })

    expect(fromMock).toHaveBeenCalledWith("bookings")
    expect(insertMock).toHaveBeenCalledTimes(1)

    const insertedRow = insertMock.mock.calls[0]?.[0]
    expect(insertedRow).toMatchObject({
      amenity_id: "kitchen",
      unit_id: "unit-101",
      tenant_id: "user-1",
      start_time: "2024-01-01T10:00:00.000Z",
      end_time: "2024-01-01T11:00:00.000Z",
    })
  })

  it("returns a friendly error when an overlapping booking exists", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } })
    singleMock.mockResolvedValue({
      data: null,
      error: {
        code: "23P01",
        message: "conflict",
        details: "",
        hint: "",
      },
    })

    const response = await POST(buildRequest())

    expect(response.status).toBe(409)
    const payload = await response.json()
    expect(payload.error).toMatch(/already booked/i)
  })

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const response = await POST(buildRequest())

    expect(response.status).toBe(401)
    const payload = await response.json()
    expect(payload).toEqual({ error: "Unauthorized" })
    expect(fromMock).not.toHaveBeenCalled()
  })
})
