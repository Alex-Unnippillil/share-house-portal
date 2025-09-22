import { createHmac, timingSafeEqual } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

const SIGNATURE_HEADER_CANDIDATES = [
  "x-cal-signature-256",
  "cal-signature-256",
  "x-cal-signature",
]

const SUPPORTED_TRIGGER_EVENTS = [
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
] as const

const SUPPORTED_EVENTS = new Set<string>(SUPPORTED_TRIGGER_EVENTS)

type SupportedTriggerEvent = (typeof SUPPORTED_TRIGGER_EVENTS)[number]

type SupabaseAdminClient = SupabaseClient<Database>

type JsonRecord = Record<string, unknown>

type CalAttendee = {
  email?: string
  name?: string
}

type CalOrganizer = {
  email?: string
  name?: string
}

type CalBooking = {
  id?: string | number
  uid?: string
  title?: string | null
  description?: string | null
  startTime?: string | number | null
  endTime?: string | number | null
  start_time?: string | number | null
  end_time?: string | number | null
  status?: string | null
  eventTypeId?: number | string | null
  event_type_id?: number | string | null
  location?: string | null
  metadata?: JsonRecord | null
  cancellationReason?: string | null
  cancellation_reason?: string | null
}

type CalWebhookPayload = {
  booking?: CalBooking
  attendees?: CalAttendee[]
  organizer?: CalOrganizer
  eventTypeId?: number | string
  event_type_id?: number | string
  startTime?: string | number
  endTime?: string | number
  start_time?: string | number
  end_time?: string | number
  [key: string]: unknown
}

type CalWebhookEvent = {
  triggerEvent: string
  payload?: CalWebhookPayload
  [key: string]: unknown
}

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"]
type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"]

type AmenitiesSelect = Database["public"]["Tables"]["amenities"]["Row"]

export async function POST(req: Request) {
  const rawBody = await req.text()

  try {
    verifyRequestSignature(rawBody, req.headers)
  } catch (error) {
    console.error("[calcom-webhook] signature verification failed", error)
    return new Response("Invalid webhook signature", { status: 400 })
  }

  let event: CalWebhookEvent
  try {
    event = JSON.parse(rawBody) as CalWebhookEvent
  } catch (error) {
    console.error("[calcom-webhook] failed to parse webhook payload", error)
    return new Response("Invalid webhook payload", { status: 400 })
  }

  if (!SUPPORTED_EVENTS.has(event.triggerEvent)) {
    return new Response(null, { status: 202 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    const processed = await handleCalWebhookEvent(supabase, event)

    if (!processed) {
      // We acknowledged the webhook but did not make data changes (e.g. missing mapping).
      return new Response(null, { status: 202 })
    }

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error("[calcom-webhook] error handling event", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

function verifyRequestSignature(rawBody: string, headers: Headers) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET

  if (!secret) {
    throw new Error("Missing CALCOM_WEBHOOK_SECRET environment variable")
  }

  const signatureHeader = getSignatureHeader(headers)

  if (!signatureHeader) {
    throw new Error("Missing Cal.com signature header")
  }

  const providedSignature = extractSignatureFromHeader(signatureHeader)

  if (!providedSignature) {
    throw new Error("Unable to parse signature header")
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  const providedBuffer = Buffer.from(providedSignature, "hex")
  const expectedBuffer = Buffer.from(expectedSignature, "hex")

  if (providedBuffer.length !== expectedBuffer.length) {
    throw new Error("Signature length mismatch")
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Signature verification failed")
  }
}

function getSignatureHeader(headers: Headers) {
  for (const candidate of SIGNATURE_HEADER_CANDIDATES) {
    const value = headers.get(candidate)
    if (value) {
      return value
    }
  }

  return null
}

function extractSignatureFromHeader(headerValue: string) {
  const segments = headerValue.split(",").map((segment) => segment.trim())

  for (const segment of segments) {
    if (segment.startsWith("sha256=")) {
      return segment.slice("sha256=".length)
    }

    if (segment.startsWith("v1=")) {
      return segment.slice("v1=".length)
    }

    if (!segment.includes("=")) {
      return segment
    }
  }

  return null
}

function createSupabaseAdminClient(): SupabaseAdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration")
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function handleCalWebhookEvent(
  supabase: SupabaseAdminClient,
  event: CalWebhookEvent,
) {
  const payload: CalWebhookPayload = event.payload ?? {}
  const booking = payload.booking ?? (event as CalWebhookEvent & { booking?: CalBooking }).booking

  if (!booking) {
    await recordAuditLog(supabase, {
      action: "CALCOM_MISSING_BOOKING",
      entity_type: "booking",
      entity_id: null,
      metadata: { triggerEvent: event.triggerEvent },
    })

    return false
  }

  const externalId = deriveBookingIdentifier(booking)

  if (!externalId) {
    await recordAuditLog(supabase, {
      action: "CALCOM_MISSING_BOOKING_IDENTIFIER",
      entity_type: "booking",
      entity_id: null,
      metadata: { triggerEvent: event.triggerEvent },
    })

    return false
  }

  const eventTypeId = resolveEventTypeId(payload, booking)

  if (eventTypeId === null) {
    await recordAuditLog(supabase, {
      action: "CALCOM_UNMAPPED_EVENT_TYPE",
      entity_type: "booking",
      entity_id: externalId,
      metadata: { triggerEvent: event.triggerEvent },
    })

    return false
  }

  const amenityId = await lookupAmenityId(supabase, eventTypeId)

  if (!amenityId) {
    await recordAuditLog(supabase, {
      action: "CALCOM_AMENITY_NOT_CONFIGURED",
      entity_type: "booking",
      entity_id: externalId,
      metadata: { triggerEvent: event.triggerEvent, eventTypeId },
    })

    return false
  }

  const attendees = Array.isArray(payload.attendees) ? payload.attendees : []
  const organizer = payload.organizer

  const startTime = extractDateTime("start", booking, payload)
  const endTime = extractDateTime("end", booking, payload)

  if (event.triggerEvent !== "BOOKING_CANCELLED" && (!startTime || !endTime)) {
    await recordAuditLog(supabase, {
      action: "CALCOM_INCOMPLETE_BOOKING",
      entity_type: "booking",
      entity_id: externalId,
      metadata: { triggerEvent: event.triggerEvent, eventTypeId },
    })

    return false
  }

  if (event.triggerEvent === "BOOKING_CANCELLED") {
    await handleCancellation(
      supabase,
      externalId,
      amenityId,
      event,
      booking,
      attendees,
      organizer,
      startTime,
      endTime,
      eventTypeId,
    )

    return true
  }

  const record = buildBookingRecord({
    amenityId,
    attendees,
    booking,
    endTime: endTime!,
    eventTypeId,
    externalId,
    organizer,
    startTime: startTime!,
    trigger: event.triggerEvent as SupportedTriggerEvent,
  })

  const { error: upsertError } = await supabase
    .from("bookings")
    .upsert(record, { onConflict: "external_id" })

  if (upsertError) {
    throw new Error(`Failed to upsert booking: ${upsertError.message}`)
  }

  await recordAuditLog(supabase, {
    action: event.triggerEvent,
    entity_type: "booking",
    entity_id: externalId,
    metadata: buildAuditMetadata({
      amenityId,
      attendees,
      endTime: record.end_time!,
      eventTypeId,
      organizer,
      startTime: record.start_time!,
      status: record.status!,
      cancellationReason: null,
    }),
  })

  return true
}

async function handleCancellation(
  supabase: SupabaseAdminClient,
  externalId: string,
  amenityId: string,
  event: CalWebhookEvent,
  booking: CalBooking,
  attendees: CalAttendee[],
  organizer: CalOrganizer | undefined,
  startTime: string | null,
  endTime: string | null,
  eventTypeId: number,
) {
  const deleteBuilder = supabase.from("bookings").delete()
  const { error: deleteError } = await deleteBuilder.eq("external_id", externalId)

  if (deleteError) {
    throw new Error(`Failed to delete cancelled booking: ${deleteError.message}`)
  }

  await recordAuditLog(supabase, {
    action: event.triggerEvent,
    entity_type: "booking",
    entity_id: externalId,
    metadata: buildAuditMetadata({
      amenityId,
      attendees,
      endTime: endTime ?? null,
      eventTypeId,
      organizer,
      startTime: startTime ?? null,
      status: "cancelled",
      cancellationReason:
        booking.cancellationReason ?? booking.cancellation_reason ?? null,
    }),
  })
}

function resolveEventTypeId(payload: CalWebhookPayload, booking: CalBooking) {
  const candidates = [
    booking.eventTypeId,
    booking.event_type_id,
    payload.eventTypeId,
    payload.event_type_id,
  ]

  for (const candidate of candidates) {
    const parsed = parseNumeric(candidate)
    if (parsed !== null) {
      return parsed
    }
  }

  return null
}

function parseNumeric(candidate: unknown) {
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate
  }

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    const parsed = Number.parseInt(candidate, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

async function lookupAmenityId(
  supabase: SupabaseAdminClient,
  eventTypeId: number,
): Promise<string | null> {
  const query = supabase.from("amenities").select("id, cal_event_type_id").eq(
    "cal_event_type_id",
    eventTypeId,
  )
  const { data, error } = await query.maybeSingle<AmenitiesSelect>()

  if (error) {
    throw new Error(`Failed to load amenity mapping: ${error.message}`)
  }

  return data?.id ?? null
}

function deriveBookingIdentifier(booking: CalBooking) {
  if (booking.uid) {
    return booking.uid
  }

  if (booking.id !== undefined && booking.id !== null) {
    return String(booking.id)
  }

  return null
}

function extractDateTime(
  field: "start" | "end",
  booking: CalBooking,
  payload: CalWebhookPayload,
) {
  const bookingKey = field === "start" ? "startTime" : "endTime"
  const fallbackKey = field === "start" ? "start_time" : "end_time"
  const payloadKey = field === "start" ? "startTime" : "endTime"
  const payloadFallback = field === "start" ? "start_time" : "end_time"

  const candidate =
    (booking as Record<string, unknown>)[bookingKey] ??
    (booking as Record<string, unknown>)[fallbackKey] ??
    (payload as Record<string, unknown>)[payloadKey] ??
    (payload as Record<string, unknown>)[payloadFallback]

  if (candidate === undefined || candidate === null) {
    return null
  }

  return normaliseDateTime(candidate)
}

function normaliseDateTime(candidate: unknown) {
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return new Date(candidate).toISOString()
  }

  if (typeof candidate === "string") {
    const trimmed = candidate.trim()
    if (!trimmed) {
      return null
    }

    const parsed = new Date(trimmed)

    if (Number.isNaN(parsed.getTime())) {
      return trimmed
    }

    return parsed.toISOString()
  }

  return null
}

function buildBookingRecord({
  amenityId,
  attendees,
  booking,
  endTime,
  eventTypeId,
  externalId,
  organizer,
  startTime,
  trigger,
}: {
  amenityId: string
  attendees: CalAttendee[]
  booking: CalBooking
  endTime: string
  eventTypeId: number
  externalId: string
  organizer?: CalOrganizer
  startTime: string
  trigger: SupportedTriggerEvent
}): BookingInsert {
  const attendeeEmails = attendees
    .map((attendee) => attendee.email)
    .filter((email): email is string => Boolean(email))

  const attendeeNames = attendees
    .map((attendee) => attendee.name)
    .filter((name): name is string => Boolean(name))

  return {
    amenity_id: amenityId,
    attendee_emails: attendeeEmails,
    description: booking.description ?? null,
    end_time: endTime,
    external_id: externalId,
    location: booking.location ?? null,
    metadata: {
      attendeeNames,
      eventTypeId,
      notes: booking.metadata ?? null,
    },
    organizer_email: organizer?.email ?? null,
    start_time: startTime,
    status:
      trigger === "BOOKING_RESCHEDULED"
        ? "rescheduled"
        : booking.status ?? "confirmed",
    title: booking.title ?? null,
    updated_at: new Date().toISOString(),
  }
}

function buildAuditMetadata({
  amenityId,
  attendees,
  cancellationReason,
  endTime,
  eventTypeId,
  organizer,
  startTime,
  status,
}: {
  amenityId: string
  attendees: CalAttendee[]
  cancellationReason: string | null
  endTime: string | null
  eventTypeId: number
  organizer?: CalOrganizer
  startTime: string | null
  status: string
}): AuditLogInsert["metadata"] {
  const attendeeEmails = attendees
    .map((attendee) => attendee.email)
    .filter((email): email is string => Boolean(email))

  const metadata: JsonRecord = {
    amenityId,
    attendeeEmails,
    eventTypeId,
    organizerEmail: organizer?.email ?? null,
    startTime,
    endTime,
    status,
  }

  if (cancellationReason) {
    metadata.cancellationReason = cancellationReason
  }

  return metadata
}

async function recordAuditLog(
  supabase: SupabaseAdminClient,
  entry: AuditLogInsert,
) {
  const { error } = await supabase.from("audit_logs").insert(entry)

  if (error) {
    console.error("[calcom-webhook] failed to persist audit log", error)
  }
}
