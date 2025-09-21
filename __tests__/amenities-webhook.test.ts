import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Database } from "@/lib/supabase"
import { POST } from "@/app/api/calcom/webhook/route"

const createAdminClientMock = vi.hoisted(() => vi.fn())
const fetchCalcomBookingMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock("@/lib/calcom", () => ({
  fetchCalcomBooking: fetchCalcomBookingMock,
}))

type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"]
type AmenityBookingRow = Database["public"]["Tables"]["amenity_bookings"]["Row"]

function createAdminSupabaseMock(options: {
  amenity: AmenityRow
  existingBooking?: AmenityBookingRow | null
  conflictBooking?: AmenityBookingRow | null
  upsertError?: { code: string } | null
}) {
  const {
    amenity,
    existingBooking = null,
    conflictBooking = null,
    upsertError = null,
  } = options

  const recordedUpserts: any[] = []
  const recordedUpdates: Array<{ notes: string }> = []

  const client = {
    from: vi.fn((table: string) => {
      if (table === "amenities") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: amenity }),
            }),
          }),
        }
      }

      if (table === "amenity_bookings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn((column: string) => {
              if (column === "calcom_booking_id") {
                return {
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: existingBooking, error: null }),
                }
              }
              if (column === "amenity_id") {
                return {
                  lte: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                      neq: vi.fn().mockReturnValue({
                        in: vi.fn().mockReturnValue({
                          maybeSingle: vi
                            .fn()
                            .mockResolvedValue({ data: conflictBooking, error: null }),
                        }),
                      }),
                    }),
                  }),
                }
              }
              throw new Error(`Unexpected filter: ${column}`)
            }),
          }),
          upsert: vi.fn().mockImplementation(async (payload: any) => {
            recordedUpserts.push(payload)
            return { error: upsertError }
          }),
          update: vi.fn().mockImplementation((payload: { notes?: string | null }) => ({
            eq: vi.fn().mockImplementation(async () => {
              recordedUpdates.push({ notes: payload.notes ?? "" })
              return { error: null }
            }),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { client, recordedUpserts, recordedUpdates }
}

beforeEach(() => {
  createAdminClientMock.mockReset()
  fetchCalcomBookingMock.mockReset()
  process.env.CALCOM_WEBHOOK_SECRET = "secret"
  delete process.env.CALCOM_BASE_URL
})

describe("POST /api/calcom/webhook", () => {
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

  const booking: AmenityBookingRow = {
    id: "booking-1",
    amenity_id: amenity.id,
    tenant_id: "tenant-1",
    building_id: null,
    unit_id: null,
    calcom_booking_id: "remote-1",
    calcom_event_type_id: 1001,
    status: "confirmed",
    start_time: "2024-05-01T10:00:00.000Z",
    end_time: "2024-05-01T11:00:00.000Z",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it("rejects requests with an invalid signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/calcom/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cal-signature": "invalid",
        },
        body: JSON.stringify({ triggerEvent: "BOOKING_CREATED" }),
      })
    )

    expect(response.status).toBe(401)
  })

  it("fetches remote booking data when the payload is incomplete", async () => {
    const { client, recordedUpserts } = createAdminSupabaseMock({
      amenity,
      existingBooking: null,
    })
    createAdminClientMock.mockReturnValue(client)
    fetchCalcomBookingMock.mockResolvedValue({
      uid: "remote-1",
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: "confirmed",
      eventTypeId: 1001,
    })

    const response = await POST(
      new Request("http://localhost/api/calcom/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cal-signature": "secret",
        },
        body: JSON.stringify({
          triggerEvent: "BOOKING_CREATED",
          payload: {
            booking: {
              uid: "remote-1",
              startTime: booking.start_time,
              endTime: booking.end_time,
            },
          },
        }),
      })
    )

    const body = (await response.json()) as { status: string }
    expect(fetchCalcomBookingMock).toHaveBeenCalledWith("remote-1")
    expect(recordedUpserts[0]).toMatchObject({
      calcom_booking_id: "remote-1",
      status: "confirmed",
    })
    expect(body.status).toBe("ok")
  })

  it("annotates conflicts when Supabase raises a unique violation", async () => {
    const conflict: AmenityBookingRow = {
      ...booking,
      id: "existing", 
      calcom_booking_id: "existing-1",
    }
    const { client, recordedUpdates } = createAdminSupabaseMock({
      amenity,
      upsertError: { code: "23505" },
      conflictBooking: conflict,
    })
    createAdminClientMock.mockReturnValue(client)
    process.env.CALCOM_BASE_URL = "https://cal.example"

    const response = await POST(
      new Request("http://localhost/api/calcom/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cal-signature": "secret",
        },
        body: JSON.stringify({
          triggerEvent: "BOOKING_CREATED",
          payload: {
            booking: {
              uid: booking.calcom_booking_id,
              startTime: booking.start_time,
              endTime: booking.end_time,
              eventTypeId: booking.calcom_event_type_id,
              status: "confirmed",
            },
          },
        }),
      })
    )

    const body = (await response.json()) as { status: string; message: string }
    expect(response.status).toBe(202)
    expect(body.status).toBe("conflict")
    expect(body.message).toContain("overlapped")
    expect(recordedUpdates.length).toBeGreaterThan(0)
    expect(recordedUpdates[0].notes).toContain("remote-1")
  })
})
