import { describe, expect, it } from "vitest"

import {
  buildWebhookMutation,
  formatConflictNote,
  getStatusFromWebhook,
  isSupabaseConflictError,
  mapBookingInsert,
  type AmenityBookingRow,
  type AmenityRow,
  type CalBookingPayload,
} from "@/lib/amenities/bookings"

describe("amenity booking helpers", () => {
  const amenity: AmenityRow = {
    id: "amenity-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    name: "Kitchen",
    slug: "kitchen",
    description: null,
    calcom_event_slug: "share-house/kitchen",
    calcom_event_type_id: 1001,
    building_id: null,
    unit_id: null,
  }

  const booking: CalBookingPayload = {
    uid: "booking-1",
    startTime: "2024-05-01T10:00:00.000Z",
    endTime: "2024-05-01T11:00:00.000Z",
    eventTypeId: 1001,
    status: "confirmed",
  }

  it("converts Cal.com payload into a Supabase insert", () => {
    const payload = mapBookingInsert({ amenity, booking, tenantId: "tenant-1" })

    expect(payload).toMatchObject({
      amenity_id: amenity.id,
      tenant_id: "tenant-1",
      calcom_booking_id: booking.uid,
      start_time: booking.startTime,
      end_time: booking.endTime,
      status: "confirmed",
    })
  })

  it("detects unique constraint conflicts", () => {
    expect(isSupabaseConflictError({ code: "23505" } as any)).toBe(true)
    expect(isSupabaseConflictError({ code: "PGRST116" } as any)).toBe(false)
  })

  it("derives webhook mutations and statuses", () => {
    const status = getStatusFromWebhook("BOOKING_CANCELLED", "confirmed")
    expect(status).toBe("cancelled")

    const mutation = buildWebhookMutation({
      amenity,
      booking,
      triggerEvent: "BOOKING_CANCELLED",
      existingTenantId: null,
    })

    expect(mutation.status).toBe("cancelled")
    expect(mutation.start_time).toBe(booking.startTime)
    expect(mutation.end_time).toBe(booking.endTime)
  })

  it("formats conflict notes with both booking identifiers", () => {
    const existing: AmenityBookingRow = {
      id: "existing",
      amenity_id: amenity.id,
      tenant_id: "tenant-1",
      calcom_booking_id: "existing-booking",
      calcom_event_type_id: 1001,
      status: "confirmed",
      start_time: "2024-05-01T09:00:00.000Z",
      end_time: "2024-05-01T10:30:00.000Z",
      building_id: null,
      unit_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: null,
    }

    const note = formatConflictNote(existing, booking)
    expect(note).toContain(existing.calcom_booking_id)
    expect(note).toContain(booking.uid)
  })
})
