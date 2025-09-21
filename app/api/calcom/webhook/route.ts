import { NextResponse } from "next/server"
import { z } from "zod"

import {
  buildWebhookMutation,
  formatConflictNote,
  isSupabaseConflictError,
  type AmenityBookingStatus,
  type CalBookingPayload,
} from "@/lib/amenities/bookings"
import { createAdminClient } from "@/lib/supabase-admin"
import { fetchCalcomBooking } from "@/lib/calcom"

const rawBookingSchema = z.object({
  uid: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  eventTypeId: z.union([z.number(), z.string()]).optional(),
  eventType: z
    .object({ id: z.union([z.number(), z.string()]) })
    .optional(),
  status: z.string().optional(),
})

type RawBooking = z.infer<typeof rawBookingSchema>

type IncomingPayload = {
  triggerEvent?: string
  payload?: Record<string, unknown>
}

function normaliseEventTypeId(booking: RawBooking): number | undefined {
  const raw = booking.eventTypeId ?? booking.eventType?.id
  if (raw === undefined || raw === null) return undefined
  const numeric = typeof raw === "string" ? Number(raw) : raw
  return Number.isFinite(numeric) ? numeric : undefined
}

function extractBooking(data: unknown): CalBookingPayload | null {
  if (!data || typeof data !== "object") return null
  const maybeBookingCandidates = [
    (data as Record<string, unknown>).booking,
    (data as Record<string, unknown>).data,
    (data as Record<string, unknown>).previous,
  ]

  for (const candidate of maybeBookingCandidates) {
    if (!candidate) continue
    const parsed = rawBookingSchema.safeParse(candidate)
    if (!parsed.success) {
      const nested = extractBooking(candidate)
      if (nested) {
        return nested
      }
      continue
    }
    const eventTypeId = normaliseEventTypeId(parsed.data)
    if (eventTypeId === undefined) {
      continue
    }
    return {
      uid: parsed.data.uid,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      eventTypeId,
      status: parsed.data.status ?? null,
    }
  }

  const parsed = rawBookingSchema.safeParse(data)
  if (!parsed.success) {
    return null
  }
  const eventTypeId = normaliseEventTypeId(parsed.data)
  if (eventTypeId === undefined) {
    return null
  }
  return {
    uid: parsed.data.uid,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    eventTypeId,
    status: parsed.data.status ?? null,
  }
}

function extractBookingIdentifiers(
  data: unknown
): { uid?: string; eventTypeId?: number } | null {
  if (!data || typeof data !== "object") return null
  const maybeBookingCandidates = [
    (data as Record<string, unknown>).booking,
    (data as Record<string, unknown>).data,
    (data as Record<string, unknown>).previous,
  ]

  for (const candidate of maybeBookingCandidates) {
    if (!candidate) continue
    const parsed = rawBookingSchema.safeParse(candidate)
    if (parsed.success) {
      const eventTypeId = normaliseEventTypeId(parsed.data)
      return {
        uid: parsed.data.uid,
        eventTypeId,
      }
    }
    const nested = extractBookingIdentifiers(candidate)
    if (nested) return nested
  }

  const parsed = rawBookingSchema.safeParse(data)
  if (!parsed.success) {
    return null
  }

  return {
    uid: parsed.data.uid,
    eventTypeId: normaliseEventTypeId(parsed.data),
  }
}

export async function POST(request: Request) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET
  const signature = request.headers.get("x-cal-signature")
  const rawBody = await request.text()

  if (secret && signature !== secret) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  let incoming: IncomingPayload

  try {
    incoming = JSON.parse(rawBody) as IncomingPayload
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  if (!incoming?.triggerEvent) {
    return NextResponse.json({ error: "Missing trigger event" }, { status: 400 })
  }

  let booking = extractBooking(incoming.payload)

  if (!booking) {
    const identifiers = extractBookingIdentifiers(incoming.payload)
    if (identifiers?.uid) {
      const remote = await fetchCalcomBooking(identifiers.uid)
      if (remote?.startTime && remote?.endTime) {
        const eventTypeId =
          remote.eventTypeId ?? identifiers.eventTypeId ?? undefined
        if (eventTypeId !== undefined && eventTypeId !== null) {
          booking = {
            uid: remote.uid,
            startTime: remote.startTime,
            endTime: remote.endTime,
            eventTypeId,
            status: remote.status,
          }
        }
      }
    }
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking payload could not be parsed" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: amenity } = await supabase
    .from("amenities")
    .select(
      "id, name, slug, description, building_id, unit_id, calcom_event_slug, calcom_event_type_id, created_at, updated_at"
    )
    .eq("calcom_event_type_id", booking.eventTypeId)
    .maybeSingle()

  if (!amenity) {
    return NextResponse.json({ status: "ignored", reason: "No matching amenity" }, { status: 202 })
  }

  const { data: existingBooking } = await supabase
    .from("amenity_bookings")
    .select("*")
    .eq("calcom_booking_id", booking.uid)
    .maybeSingle()

  const mutation = buildWebhookMutation({
    amenity,
    booking,
    triggerEvent: incoming.triggerEvent,
    existingTenantId: existingBooking?.tenant_id ?? null,
  })

  if (existingBooking?.notes) {
    mutation.notes = existingBooking.notes
  }

  const { error } = await supabase
    .from("amenity_bookings")
    .upsert(mutation, { onConflict: "calcom_booking_id" })

  if (error) {
    if (isSupabaseConflictError(error)) {
      const { data: conflicting } = await supabase
        .from("amenity_bookings")
        .select("*")
        .eq("amenity_id", amenity.id)
        .lte("start_time", mutation.end_time!)
        .gte("end_time", mutation.start_time!)
        .neq("calcom_booking_id", booking.uid)
        .in("status", ["pending", "confirmed"] as AmenityBookingStatus[])
        .maybeSingle()

      if (conflicting) {
        await supabase
          .from("amenity_bookings")
          .update({ notes: formatConflictNote(conflicting, booking) })
          .eq("id", conflicting.id)
      }

      return NextResponse.json(
        { status: "conflict", message: "Booking overlapped with an existing reservation." },
        { status: 202 }
      )
    }

    console.error("Failed to process Cal.com webhook", error)
    return NextResponse.json({ error: "Unable to sync booking" }, { status: 500 })
  }

  return NextResponse.json({ status: "ok" })
}
