import { createHmac } from "node:crypto"

import { beforeEach, describe, expect, it, vi } from "vitest"

import bookingCancelled from "./fixtures/calcom/booking-cancelled.json"
import bookingCreated from "./fixtures/calcom/booking-created.json"
import bookingRescheduled from "./fixtures/calcom/booking-rescheduled.json"

const createClientMock = vi.hoisted(() => vi.fn())

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}))

import { POST } from "@/app/api/calcom/webhook/route"

const WEBHOOK_SECRET = "test-webhook-secret"

describe("Cal.com webhook route", () => {
  beforeEach(() => {
    createClientMock.mockReset()
    process.env.CALCOM_WEBHOOK_SECRET = WEBHOOK_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role"
  })

  it("upserts bookings and writes audit logs for BOOKING_CREATED", async () => {
    const { supabaseMock, amenitiesBuilder, upsert, auditInsert } = buildSupabaseMock({
      amenityId: "amenity-42",
      eventTypeId: 42,
    })

    createClientMock.mockReturnValueOnce(supabaseMock as unknown as never)

    const response = await POST(buildSignedRequest(bookingCreated))

    expect(response.status).toBe(200)
    expect(createClientMock).toHaveBeenCalledTimes(1)

    expect(amenitiesBuilder.select).toHaveBeenCalledWith("id, cal_event_type_id")
    expect(amenitiesBuilder.eq).toHaveBeenCalledWith("cal_event_type_id", 42)

    expect(upsert).toHaveBeenCalledTimes(1)

    const [record, upsertOptions] = upsert.mock.calls[0]

    expect(record).toMatchObject({
      amenity_id: "amenity-42",
      attendee_emails: ["alex@example.com", "jamie@example.com"],
      external_id: "booking-created-uid",
      start_time: "2025-05-01T17:00:00.000Z",
      end_time: "2025-05-01T18:00:00.000Z",
      status: "confirmed",
      organizer_email: "host@example.com",
      metadata: {
        attendeeNames: ["Alex", "Jamie"],
        eventTypeId: 42,
        notes: null,
      },
    })

    expect(typeof record.updated_at).toBe("string")
    expect(new Date(record.updated_at!).getTime()).not.toBeNaN()
    expect(upsertOptions).toEqual({ onConflict: "external_id" })

    expect(auditInsert).toHaveBeenCalledTimes(1)
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BOOKING_CREATED",
        entity_type: "booking",
        entity_id: "booking-created-uid",
        metadata: expect.objectContaining({
          amenityId: "amenity-42",
          attendeeEmails: ["alex@example.com", "jamie@example.com"],
          eventTypeId: 42,
          organizerEmail: "host@example.com",
          startTime: "2025-05-01T17:00:00.000Z",
          endTime: "2025-05-01T18:00:00.000Z",
          status: "confirmed",
        }),
      }),
    )
  })

  it("marks bookings as rescheduled when receiving BOOKING_RESCHEDULED", async () => {
    const { supabaseMock, amenitiesBuilder, upsert, auditInsert } = buildSupabaseMock({
      amenityId: "amenity-84",
      eventTypeId: 84,
    })

    createClientMock.mockReturnValueOnce(supabaseMock as unknown as never)

    const response = await POST(buildSignedRequest(bookingRescheduled))

    expect(response.status).toBe(200)
    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(amenitiesBuilder.eq).toHaveBeenCalledWith("cal_event_type_id", 84)

    const [record] = upsert.mock.calls[0]
    expect(record.status).toBe("rescheduled")
    expect(record.start_time).toBe("2025-06-02T02:00:00.000Z")
    expect(record.end_time).toBe("2025-06-02T04:30:00.000Z")

    const auditEntry = auditInsert.mock.calls[0][0]
    expect(auditEntry.action).toBe("BOOKING_RESCHEDULED")
    expect(auditEntry.entity_id).toBe("booking-rescheduled-uid")
    expect(auditEntry.metadata).toMatchObject({
      amenityId: "amenity-84",
      eventTypeId: 84,
      startTime: "2025-06-02T02:00:00.000Z",
      endTime: "2025-06-02T04:30:00.000Z",
      status: "rescheduled",
    })
  })

  it("deletes bookings and records audit entries for BOOKING_CANCELLED", async () => {
    const { supabaseMock, amenitiesBuilder, deleteFn, deleteEq, auditInsert, upsert } =
      buildSupabaseMock({
        amenityId: "amenity-21",
        eventTypeId: 21,
      })

    createClientMock.mockReturnValueOnce(supabaseMock as unknown as never)

    const response = await POST(buildSignedRequest(bookingCancelled))

    expect(response.status).toBe(200)
    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(amenitiesBuilder.eq).toHaveBeenCalledWith("cal_event_type_id", 21)
    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(deleteEq).toHaveBeenCalledWith("external_id", "booking-cancelled-uid")
    expect(upsert).not.toHaveBeenCalled()

    const auditEntry = auditInsert.mock.calls[0][0]
    expect(auditEntry.action).toBe("BOOKING_CANCELLED")
    expect(auditEntry.metadata).toMatchObject({
      amenityId: "amenity-21",
      attendeeEmails: ["casey@example.com"],
      eventTypeId: 21,
      status: "cancelled",
      cancellationReason: "Resident no longer needs the spot",
    })
  })

  it("rejects requests with invalid signatures", async () => {
    const { supabaseMock } = buildSupabaseMock({
      amenityId: "amenity-42",
      eventTypeId: 42,
    })

    createClientMock.mockReturnValueOnce(supabaseMock as unknown as never)

    const invalidSignatureRequest = buildSignedRequest(bookingCreated, {
      signature: "sha256=deadbeef",
    })

    const response = await POST(invalidSignatureRequest)

    expect(response.status).toBe(400)
    expect(createClientMock).not.toHaveBeenCalled()
  })
})

type SupabaseMockOptions = {
  amenityId: string
  eventTypeId: number
}

function buildSupabaseMock({ amenityId, eventTypeId }: SupabaseMockOptions) {
  const amenitiesBuilder = createAmenitiesBuilder({ amenityId, eventTypeId })
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
  const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const deleteFn = vi.fn(() => ({ eq: deleteEq }))
  const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null })

  const from = vi.fn((table: string) => {
    switch (table) {
      case "amenities":
        return amenitiesBuilder
      case "bookings":
        return {
          upsert,
          delete: deleteFn,
        }
      case "audit_logs":
        return {
          insert: auditInsert,
        }
      default:
        throw new Error(`Unexpected table requested: ${table}`)
    }
  })

  const supabaseMock = {
    from,
  }

  return {
    supabaseMock,
    amenitiesBuilder,
    upsert,
    deleteFn,
    deleteEq,
    auditInsert,
  }
}

function createAmenitiesBuilder({ amenityId, eventTypeId }: SupabaseMockOptions) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: amenityId, cal_event_type_id: eventTypeId },
      error: null,
    }),
  }

  return builder
}

function buildSignedRequest(
  payload: unknown,
  options: { signature?: string } = {},
) {
  const body = JSON.stringify(payload)
  const signature =
    options.signature ??
    `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")}`

  return new Request("https://example.com/api/calcom/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cal-signature-256": signature,
    },
    body,
  })
}
