import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Database } from "@/lib/supabase"
import { GET, POST } from "@/app/api/amenities/bookings/route"

const cookiesMock = vi.hoisted(() => vi.fn())
const createRouteHandlerClientMock = vi.hoisted(() => vi.fn())

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createRouteHandlerClient: createRouteHandlerClientMock,
}))

type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"]
type AmenityBookingRow = Database["public"]["Tables"]["amenity_bookings"]["Row"]

function createRouteSupabaseMock(options: {
  user?: { id: string } | null
  amenity?: AmenityRow | null
  amenityError?: Error | null
  insertedBooking?: AmenityBookingRow | null
  insertError?: { code: string } | null
  bookingsForGet?: AmenityBookingRow[]
}) {
  const {
    user = { id: "tenant-1" },
    amenity = null,
    amenityError = null,
    insertedBooking = null,
    insertError = null,
    bookingsForGet = [],
  } = options

  const insertedPayloads: unknown[] = []

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "amenities") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: amenity,
                error: amenityError,
              }),
            }),
          }),
        }
      }

      if (table === "amenity_bookings") {
        return {
          insert: vi.fn().mockImplementation((payload: unknown) => {
            insertedPayloads.push(payload)
            return {
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: insertedBooking,
                  error: insertError,
                }),
              }),
            }
          }),
          select: vi.fn().mockImplementation((columns: string) => {
            if (columns.includes("notes")) {
              const filters: Record<string, string> = {}
              const builder: any = {
                eq(column: string, value: string) {
                  filters[column] = value
                  return builder
                },
                order() {
                  return builder
                },
                limit() {
                  let results = bookingsForGet
                  if (filters.tenant_id) {
                    results = results.filter(
                      (record) => record.tenant_id === filters.tenant_id
                    )
                  }
                  if (filters.amenity_id) {
                    results = results.filter(
                      (record) => record.amenity_id === filters.amenity_id
                    )
                  }
                  return Promise.resolve({ data: results, error: null })
                },
              }
              return builder
            }

            return {
              eq: vi.fn((column: string) => {
                if (column === "calcom_booking_id") {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }
                }
                throw new Error(`Unexpected filter column: ${column}`)
              }),
            }
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { supabase, insertedPayloads }
}

beforeEach(() => {
  cookiesMock.mockReturnValue({ get: vi.fn() })
  createRouteHandlerClientMock.mockReset()
})

describe("POST /api/amenities/bookings", () => {
  const amenity: AmenityRow = {
    id: "11111111-1111-1111-1111-111111111111",
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

  const insert: AmenityBookingRow = {
    id: "22222222-2222-2222-2222-222222222222",
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

  it("requires authentication", async () => {
    const { supabase } = createRouteSupabaseMock({ user: null })
    createRouteHandlerClientMock.mockReturnValue(supabase)

    const response = await POST(
      new Request("http://localhost/api/amenities/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amenityId: amenity.id, booking: {} }),
      })
    )

    expect(response.status).toBe(401)
  })

  it("persists a booking and returns the record", async () => {
    const mock = createRouteSupabaseMock({
      amenity,
      insertedBooking: insert,
    })
    createRouteHandlerClientMock.mockReturnValue(mock.supabase)

    const response = await POST(
      new Request("http://localhost/api/amenities/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amenityId: amenity.id,
          booking: {
            uid: "remote-1",
            startTime: insert.start_time,
            endTime: insert.end_time,
            eventTypeId: 1001,
          },
        }),
      })
    )

    const body = (await response.json()) as { data: AmenityBookingRow }
    expect(response.status).toBe(200)
    expect(body.data).toEqual(insert)
    expect(mock.insertedPayloads[0]).toMatchObject({
      calcom_booking_id: "remote-1",
      amenity_id: amenity.id,
    })
  })

  it("surface conflicts when Supabase reports a unique violation", async () => {
    const mock = createRouteSupabaseMock({
      amenity,
      insertedBooking: null,
      insertError: { code: "23505" },
    })
    createRouteHandlerClientMock.mockReturnValue(mock.supabase)

    const response = await POST(
      new Request("http://localhost/api/amenities/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amenityId: amenity.id,
          booking: {
            uid: "remote-1",
            startTime: insert.start_time,
            endTime: insert.end_time,
            eventTypeId: 1001,
          },
        }),
      })
    )

    const body = (await response.json()) as { error: string }
    expect(response.status).toBe(409)
    expect(body.error).toContain("already booked")
  })
})

describe("GET /api/amenities/bookings", () => {
  it("returns bookings scoped to the authenticated tenant", async () => {
    const amenityId = "44444444-4444-4444-4444-444444444444"
    const amenityBooking: AmenityBookingRow = {
      id: "33333333-3333-3333-3333-333333333333",
      amenity_id: amenityId,
      tenant_id: "tenant-1",
      building_id: null,
      unit_id: null,
      calcom_booking_id: "remote-2",
      calcom_event_type_id: 1002,
      status: "confirmed",
      start_time: "2024-05-02T10:00:00.000Z",
      end_time: "2024-05-02T11:00:00.000Z",
      notes: "Conflict detected",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const mock = createRouteSupabaseMock({
      bookingsForGet: [amenityBooking],
    })
    createRouteHandlerClientMock.mockReturnValue(mock.supabase)

    const response = await GET(
      new Request(
        `http://localhost/api/amenities/bookings?amenityId=${amenityId}`,
        {
          method: "GET",
        }
      )
    )

    const body = (await response.json()) as { data: AmenityBookingRow[] }
    expect(response.status).toBe(200)
    expect(body.data).toEqual([amenityBooking])
  })
})
