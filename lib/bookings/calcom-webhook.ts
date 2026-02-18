import type { Database, Json, TablesInsert } from "@/lib/supabase"

export const CALCOM_HANDLED_EVENTS = new Set([
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
])

export interface CalcomWebhookPayload {
  triggerEvent?: string
  payload?: {
    bookingId?: number | string
    uid?: string
    eventTypeId?: number | string
    eventTypeSlug?: string
    status?: string
    title?: string
    startTime?: string
    endTime?: string
    metadata?: Record<string, unknown>
    recurringEventId?: string
    recurrence?: Record<string, unknown>
    cancellationReason?: string
  }
}

export function normalizeCalcomStatus(eventName: string) {
  if (eventName === "BOOKING_CANCELLED") return "cancelled"
  return "confirmed"
}

export function toBookingInsert(payload: CalcomWebhookPayload): TablesInsert<"bookings"> | null {
  const eventName = payload.triggerEvent
  const booking = payload.payload
  if (!eventName || !booking) {
    return null
  }

  if (!CALCOM_HANDLED_EVENTS.has(eventName)) {
    return null
  }

  const metadata = booking.metadata ?? {}
  const propertyId = typeof metadata.propertyId === "string" ? metadata.propertyId : "unknown-property"
  const amenityId =
    typeof metadata.amenityId === "string" ? metadata.amenityId : booking.eventTypeSlug ?? "unknown-amenity"
  const amenityName =
    typeof metadata.amenityName === "string" ? metadata.amenityName : booking.title ?? "Amenity booking"

  const startTime = booking.startTime
  const endTime = booking.endTime
  if (!startTime || !endTime) {
    return null
  }

  return {
    property_id: propertyId,
    amenity_id: amenityId,
    amenity_name: amenityName,
    status: normalizeCalcomStatus(eventName),
    start_time: startTime,
    end_time: endTime,
    source: "calcom",
    source_booking_id: String(booking.bookingId ?? booking.uid ?? ""),
    source_event_type_id: booking.eventTypeId ? String(booking.eventTypeId) : null,
    source_payload: payload as unknown as Database["public"]["Tables"]["bookings"]["Row"]["source_payload"],
    recurrence_id: booking.recurringEventId ?? null,
    recurrence_rule: (booking.recurrence ?? null) as Json | null,
    cancelled_at: eventName === "BOOKING_CANCELLED" ? new Date().toISOString() : null,
    cancellation_reason: booking.cancellationReason ?? null,
  }
}
