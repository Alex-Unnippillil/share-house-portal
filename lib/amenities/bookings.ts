import type { PostgrestError } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

export type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"]
export type AmenityBookingInsert = Database["public"]["Tables"]["amenity_bookings"]["Insert"]
export type AmenityBookingRow = Database["public"]["Tables"]["amenity_bookings"]["Row"]
export type AmenityBookingStatus = Database["public"]["Enums"]["amenity_booking_status"]

export interface CalBookingPayload {
  uid: string
  startTime: string
  endTime: string
  eventTypeId: number
  status?: string | null
}

function assertAmenityMatches(amenity: AmenityRow, booking: CalBookingPayload) {
  if (amenity.calcom_event_type_id == null) {
    throw new Error("Amenity is missing a Cal.com event type id")
  }
  if (amenity.calcom_event_type_id !== booking.eventTypeId) {
    throw new Error("Booking does not belong to the requested amenity")
  }
}

function parseIso(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value provided by Cal.com")
  }
  return parsed
}

function normalizeStatus(rawStatus?: string | null): AmenityBookingStatus {
  if (!rawStatus) return "confirmed"
  const normalized = rawStatus.toLowerCase()
  if (normalized.includes("cancel")) return "cancelled"
  if (normalized.includes("pending")) return "pending"
  return "confirmed"
}

export function mapBookingInsert({
  amenity,
  booking,
  tenantId,
  overrideStatus,
}: {
  amenity: AmenityRow
  booking: CalBookingPayload
  tenantId: string | null
  overrideStatus?: AmenityBookingStatus
}): AmenityBookingInsert {
  assertAmenityMatches(amenity, booking)
  const start = parseIso(booking.startTime)
  const end = parseIso(booking.endTime)

  if (end <= start) {
    throw new Error("Booking end time must be after the start time")
  }

  const status = overrideStatus ?? normalizeStatus(booking.status)

  return {
    amenity_id: amenity.id,
    building_id: amenity.building_id,
    unit_id: amenity.unit_id,
    tenant_id: tenantId,
    calcom_booking_id: booking.uid,
    calcom_event_type_id: booking.eventTypeId,
    status,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    notes: null,
  }
}

export function isSupabaseConflictError(error: unknown): error is PostgrestError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as PostgrestError).code === "23505"
  )
}

export function getStatusFromWebhook(
  triggerEvent: string,
  bookingStatus?: string | null
): AmenityBookingStatus {
  const normalizedTrigger = triggerEvent.toLowerCase()
  if (normalizedTrigger.includes("cancel")) {
    return "cancelled"
  }
  const normalizedStatus = bookingStatus?.toLowerCase() ?? ""
  if (normalizedStatus.includes("cancel")) {
    return "cancelled"
  }
  if (normalizedStatus.includes("pending")) {
    return "pending"
  }
  return "confirmed"
}

export function buildWebhookMutation({
  amenity,
  booking,
  triggerEvent,
  existingTenantId,
}: {
  amenity: AmenityRow
  booking: CalBookingPayload
  triggerEvent: string
  existingTenantId: string | null
}): AmenityBookingInsert {
  const status = getStatusFromWebhook(triggerEvent, booking.status)
  return mapBookingInsert({
    amenity,
    booking,
    tenantId: existingTenantId,
    overrideStatus: status,
  })
}

export function formatConflictNote(
  existing: AmenityBookingRow,
  incoming: CalBookingPayload
) {
  const existingStart = new Date(existing.start_time).toISOString()
  const incomingStart = parseIso(incoming.startTime).toISOString()
  const baseUrl = process.env.CALCOM_BASE_URL?.replace(/\/$/, "")
  const link = baseUrl ? `${baseUrl}/bookings/${incoming.uid}` : null
  const baseMessage = `Conflict detected for booking ${incoming.uid} at ${incomingStart}. Existing booking ${existing.calcom_booking_id} starting at ${existingStart} remains confirmed.`
  return link ? `${baseMessage} Review details at ${link}.` : baseMessage
}
