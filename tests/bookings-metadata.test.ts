import { describe, expect, it } from "vitest"

import {
  buildBookingRecord,
  coerceBookingMetadata,
  normalizeCalcomBookingPayload,
  normalizeCalcomResponses,
  parseCalcomWebhookPayload,
  type BookingMetadata,
} from "@/lib/calcom"

const sampleResponses = [
  { label: "Guest Name", value: "Jamie" },
  { label: "Dietary Needs", identifier: "dietary_needs", value: ["vegan", "gluten-free"] },
  { label: "Parking", value: [{ value: "garage" }, { value: "street" }] },
  { label: "Overnight", type: "boolean", value: true },
]

describe("Cal.com response normalization", () => {
  it("creates slugified metadata entries for responses", () => {
    const metadata = normalizeCalcomResponses(sampleResponses)

    expect(metadata.guest_name.value).toBe("Jamie")
    expect(metadata.dietary_needs.value).toEqual(["vegan", "gluten-free"])
    expect(metadata.parking.value).toEqual(["garage", "street"])
    expect(metadata.overnight.type).toBe("boolean")
  })

  it("coerces plain metadata into structured booking metadata", () => {
    const metadata = coerceBookingMetadata({
      host: "Riley",
      internal_notes: { keyholder: "Suite 2" },
    })

    expect(metadata.host.label).toBe("Host")
    expect(metadata.host.value).toBe("Riley")
    expect(metadata.internal_notes.type).toBe("object")
  })
})

describe("Booking persistence payloads", () => {
  it("merges existing metadata and normalized responses", () => {
    const record = buildBookingRecord({
      booking: {
        id: 42,
        startTime: "2024-07-01T10:00:00.000Z",
        endTime: "2024-07-01T11:00:00.000Z",
        attendees: [{ email: "guest@example.com", name: "Jamie" }],
        metadata: {
          host_room: { label: "Host room", value: "B3", type: "text" },
          reminder: "Bring spare key",
        },
        responses: sampleResponses,
        status: "ACCEPTED",
        eventType: { slug: "kitchen" },
        title: "Kitchen reservation",
      },
      triggerEvent: "BOOKING_CREATED",
    })

    const metadata = record.metadata as BookingMetadata

    expect(record.calcom_booking_id).toBe("42")
    expect(record.status).toBe("accepted")
    expect(record.attendee_email).toBe("guest@example.com")
    expect(record.event_slug).toBe("kitchen")

    expect(metadata.host_room.value).toBe("B3")
    expect(metadata.reminder.value).toBe("Bring spare key")
    expect(metadata.dietary_needs.value).toEqual(["vegan", "gluten-free"])
    expect(metadata.last_calcom_event.value).toBe("BOOKING_CREATED")
  })

  it("parses nested webhook payloads", () => {
    const payload = {
      triggerEvent: "BOOKING_CANCELLED",
      payload: {
        data: {
          booking: {
            id: "abc123",
            startTime: "2024-07-02T09:00:00.000Z",
            endTime: "2024-07-02T10:00:00.000Z",
            attendees: [{ email: "guest@example.com" }],
            responses: [{ label: "Apartment", value: "12B" }],
          },
        },
      },
    }

    const parsed = parseCalcomWebhookPayload(payload)
    expect(parsed).not.toBeNull()
    expect(parsed?.triggerEvent).toBe("BOOKING_CANCELLED")
    expect(parsed?.booking.startTime).toBe("2024-07-02T09:00:00.000Z")

    const record = buildBookingRecord(parsed!)
    const metadata = record.metadata as BookingMetadata

    expect(metadata.apartment.value).toBe("12B")
    expect(record.status).toBe("cancelled")
  })

  it("supports manual booking payloads without webhook wrapper", () => {
    const booking = normalizeCalcomBookingPayload({
      id: "manual-1",
      startTime: "2024-07-03T18:00:00.000Z",
      endTime: "2024-07-03T19:00:00.000Z",
      attendees: [{ email: "manual@example.com" }],
      responses: [{ label: "Guest", value: "Kai" }],
    })

    expect(booking).not.toBeNull()
    const record = buildBookingRecord({ booking: booking!, triggerEvent: null })
    const metadata = record.metadata as BookingMetadata

    expect(metadata.guest.value).toBe("Kai")
    expect(record.status).toBeNull()
  })
})
