import type { Database, Json } from "@/lib/supabase"

export type BookingTable = Database["public"]["Tables"]["bookings"]
export type BookingInsert = BookingTable["Insert"]
export type BookingRow = BookingTable["Row"]

export interface CalcomResponse {
  label?: string
  identifier?: string | null
  name?: string | null
  question?: string | null
  key?: string | null
  type?: string | null
  responseType?: string | null
  questionType?: string | null
  value?: unknown
  response?: unknown
  answer?: unknown
}

export interface CalcomAttendee {
  email?: string | null
  name?: string | null
  fullName?: string | null
  username?: string | null
}

export interface CalcomBookingInput {
  id: number | string
  uid?: string | null
  startTime: string
  endTime: string
  status?: string | null
  responses?: CalcomResponse[] | null
  attendees?: CalcomAttendee[] | null
  eventType?: unknown
  eventSlug?: string | null
  title?: string | null
  metadata?: unknown
  createdAt?: string | null
  updatedAt?: string | null
}

export interface BuildBookingRecordArgs {
  booking: CalcomBookingInput
  triggerEvent?: string | null
}

export interface NormalizedCalcomResponse {
  label: string
  value: Json
  type: string
}

export type BookingMetadata = Record<string, NormalizedCalcomResponse>

const TRIGGER_STATUS_MAP: Record<string, string> = {
  BOOKING_CREATED: "confirmed",
  BOOKING_UPDATED: "updated",
  BOOKING_RESCHEDULED: "rescheduled",
  BOOKING_CANCELLED: "cancelled",
  BOOKING_CANCELED: "cancelled",
}

const DEFAULT_KEY_FALLBACK = "custom_field"

export function normalizeCalcomResponses(
  responses: CalcomResponse[] | null | undefined
): BookingMetadata {
  if (!responses?.length) {
    return {}
  }

  const metadata: BookingMetadata = {}
  const usedKeys = new Set<string>()

  for (const response of responses) {
    if (!response) continue

    const keySource =
      response.identifier ?? response.name ?? response.key ?? response.label ?? response.question
    if (!keySource) continue

    const baseKey = slugifyKey(keySource)
    const key = ensureUniqueKey(baseKey, usedKeys)
    const label = response.label ?? response.question ?? toLabelFromKey(baseKey)
    const rawValue = extractResponseValue(response)
    const value = toJson(rawValue)

    metadata[key] = {
      label,
      value,
      type: response.type ?? response.responseType ?? response.questionType ?? inferJsonType(value),
    }
  }

  return metadata
}

export function coerceBookingMetadata(input: unknown): BookingMetadata {
  if (!isRecord(input)) {
    return {}
  }

  const metadata: BookingMetadata = {}

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = typeof rawKey === "string" && rawKey.length > 0 ? rawKey : DEFAULT_KEY_FALLBACK

    if (isNormalizedResponse(rawValue)) {
      const jsonValue = toJson(rawValue.value)
      metadata[key] = {
        label: rawValue.label,
        value: jsonValue,
        type: typeof rawValue.type === "string" && rawValue.type.length > 0
          ? rawValue.type
          : inferJsonType(jsonValue),
      }
      continue
    }

    const jsonValue = toJson(rawValue)
    metadata[key] = {
      label: toLabelFromKey(key),
      value: jsonValue,
      type: inferJsonType(jsonValue),
    }
  }

  return metadata
}

export function buildBookingRecord({ booking, triggerEvent }: BuildBookingRecordArgs): BookingInsert {
  const attendees = normalizeAttendees(booking.attendees)
  const primaryAttendee = attendees[0]

  const baseMetadata = coerceBookingMetadata(booking.metadata)
  const responseMetadata = normalizeCalcomResponses(booking.responses)
  const metadata: BookingMetadata = { ...baseMetadata, ...responseMetadata }

  if (triggerEvent) {
    metadata.last_calcom_event = {
      label: "Last Cal.com event",
      value: triggerEvent,
      type: "system",
    }
  }

  if (booking.title && !metadata.event_title) {
    metadata.event_title = {
      label: "Event title",
      value: booking.title,
      type: "text",
    }
  }

  const eventSlug = extractEventSlug(booking)
  if (eventSlug && !metadata.event_slug) {
    metadata.event_slug = {
      label: "Event slug",
      value: eventSlug,
      type: "text",
    }
  }

  const record: BookingInsert = {
    calcom_booking_id: String(booking.id),
    uid: booking.uid ? String(booking.uid) : null,
    start_time: booking.startTime,
    end_time: booking.endTime,
    status: deriveStatus(booking.status, triggerEvent),
    attendee_email: primaryAttendee?.email ?? null,
    attendee_name: primaryAttendee?.name ?? null,
    event_slug: eventSlug ?? null,
    metadata,
  }

  if (booking.createdAt) {
    record.created_at = booking.createdAt
  }

  if (booking.updatedAt) {
    record.updated_at = booking.updatedAt
  }

  return record
}

export function normalizeCalcomBookingPayload(input: unknown): CalcomBookingInput | null {
  if (!isRecord(input)) {
    return null
  }

  const bookingObject = extractBookingObject(input)
  if (!bookingObject) {
    return null
  }

  return mapBooking(bookingObject)
}

export function parseCalcomWebhookPayload(body: unknown): BuildBookingRecordArgs | null {
  if (!isRecord(body)) {
    return null
  }

  const booking = normalizeCalcomBookingPayload(body)
  if (!booking) {
    return null
  }

  const triggerEvent = extractTriggerEvent(body)

  return { booking, triggerEvent }
}

function mapBooking(record: Record<string, unknown>): CalcomBookingInput | null {
  const idCandidate = record.id ?? record.uid ?? record.eventId ?? record.hash ?? record.reference
  if (idCandidate === null || idCandidate === undefined) {
    return null
  }

  const start = record.startTime ?? record.start_time
  const end = record.endTime ?? record.end_time
  if (typeof start !== "string" || typeof end !== "string") {
    return null
  }

  const responses = Array.isArray(record.responses)
    ? (record.responses as unknown[])
        .map((item) => parseResponse(item))
        .filter((item): item is CalcomResponse => item !== null)
    : undefined

  const attendees = normalizeAttendees(record.attendees)

  const metadataSource = record.metadata ?? record.meta
  const metadata = isRecord(metadataSource) ? metadataSource : undefined

  const createdAt =
    typeof record.createdAt === "string"
      ? record.createdAt
      : typeof record.created_at === "string"
        ? record.created_at
        : undefined

  const updatedAt =
    typeof record.updatedAt === "string"
      ? record.updatedAt
      : typeof record.updated_at === "string"
        ? record.updated_at
        : undefined

  const eventSlug =
    typeof record.eventSlug === "string"
      ? record.eventSlug
      : typeof record.event_slug === "string"
        ? record.event_slug
        : undefined

  const eventType = record.eventType ?? record.event_type ?? record.event ?? undefined

  return {
    id: idCandidate as number | string,
    uid: typeof record.uid === "string" ? record.uid : null,
    startTime: start,
    endTime: end,
    status: typeof record.status === "string" ? record.status : undefined,
    responses,
    attendees,
    metadata,
    createdAt: createdAt ?? null,
    updatedAt: updatedAt ?? null,
    eventSlug: eventSlug ?? null,
    eventType,
    title: typeof record.title === "string" ? record.title : undefined,
  }
}

function normalizeAttendees(input: unknown): { email: string | null; name: string | null }[] {
  if (!Array.isArray(input)) {
    return []
  }

  const attendees: { email: string | null; name: string | null }[] = []

  for (const value of input) {
    if (!isRecord(value)) continue

    const email = typeof value.email === "string"
      ? value.email
      : typeof value.address === "string"
        ? value.address
        : null
    const name = typeof value.name === "string"
      ? value.name
      : typeof value.fullName === "string"
        ? value.fullName
        : typeof value.username === "string"
          ? value.username
          : null

    if (email !== null || name !== null) {
      attendees.push({ email, name })
    }
  }

  return attendees
}

function parseResponse(value: unknown): CalcomResponse | null {
  if (!isRecord(value)) {
    return null
  }

  const label =
    typeof value.label === "string"
      ? value.label
      : typeof value.question === "string"
        ? value.question
        : typeof value.name === "string"
          ? value.name
          : null

  if (!label) {
    return null
  }

  const identifier =
    typeof value.identifier === "string"
      ? value.identifier
      : typeof value.name === "string"
        ? value.name
        : typeof value.key === "string"
          ? value.key
          : null

  const type =
    typeof value.type === "string"
      ? value.type
      : typeof value.responseType === "string"
        ? value.responseType
        : typeof value.questionType === "string"
          ? value.questionType
          : null

  const response: CalcomResponse = {
    label,
    identifier,
    type,
    value: extractResponseValue(value),
  }

  return response
}

function extractResponseValue(value: CalcomResponse | Record<string, unknown>): unknown {
  const candidate =
    "value" in value && value.value !== undefined
      ? value.value
      : "response" in value && value.response !== undefined
        ? value.response
        : "answer" in value && value.answer !== undefined
          ? value.answer
          : null

  if (Array.isArray(candidate)) {
    return candidate.map((entry) => {
      if (isRecord(entry)) {
        if ("value" in entry && entry.value !== undefined) {
          return entry.value
        }
        if ("label" in entry && entry.label !== undefined) {
          return entry.label
        }
      }
      return entry
    })
  }

  if (isRecord(candidate)) {
    if ("value" in candidate && candidate.value !== undefined) {
      return candidate.value
    }
    if ("label" in candidate && candidate.label !== undefined) {
      return candidate.label
    }
  }

  return candidate
}

function extractBookingObject(source: Record<string, unknown>): Record<string, unknown> | null {
  if ("booking" in source && isRecord(source.booking)) {
    const bookingCandidate = source.booking
    if (looksLikeBooking(bookingCandidate)) {
      return bookingCandidate
    }
  }

  if ("data" in source && isRecord(source.data)) {
    const nested = extractBookingObject(source.data)
    if (nested) {
      return nested
    }
  }

  if ("payload" in source && isRecord(source.payload)) {
    const nested = extractBookingObject(source.payload)
    if (nested) {
      return nested
    }
  }

  if (looksLikeBooking(source)) {
    return source
  }

  return null
}

function looksLikeBooking(value: Record<string, unknown>): boolean {
  const hasStart = typeof value.startTime === "string" || typeof value.start_time === "string"
  const hasEnd = typeof value.endTime === "string" || typeof value.end_time === "string"
  const hasIdentifier =
    value.id !== undefined || value.uid !== undefined || value.eventId !== undefined || value.hash !== undefined

  return Boolean(hasStart && hasEnd && hasIdentifier)
}

function deriveStatus(status?: string | null, triggerEvent?: string | null): string | null {
  if (typeof status === "string" && status.length > 0) {
    return status.toLowerCase()
  }
  if (typeof triggerEvent === "string" && triggerEvent.length > 0) {
    const upper = triggerEvent.toUpperCase()
    return TRIGGER_STATUS_MAP[upper] ?? triggerEvent.toLowerCase()
  }
  return null
}

function extractEventSlug(booking: CalcomBookingInput): string | null {
  if (booking.eventSlug && booking.eventSlug.length > 0) {
    return booking.eventSlug
  }

  const { eventType } = booking
  if (typeof eventType === "string" && eventType.length > 0) {
    return eventType
  }

  if (isRecord(eventType)) {
    if (typeof eventType.slug === "string" && eventType.slug.length > 0) {
      return eventType.slug
    }
    if (typeof eventType.name === "string" && eventType.name.length > 0) {
      return slugifyKey(eventType.name)
    }
    if (typeof eventType.title === "string" && eventType.title.length > 0) {
      return slugifyKey(eventType.title)
    }
  }

  if (typeof booking.title === "string" && booking.title.length > 0) {
    return slugifyKey(booking.title)
  }

  return null
}

function extractTriggerEvent(source: Record<string, unknown>): string | undefined {
  const candidate =
    source.triggerEvent ??
    source.event ??
    source.type ??
    source.action

  return typeof candidate === "string" ? candidate : undefined
}

function ensureUniqueKey(baseKey: string, usedKeys: Set<string>): string {
  if (!usedKeys.has(baseKey)) {
    usedKeys.add(baseKey)
    return baseKey
  }

  let index = 2
  let unique = `${baseKey}_${index}`
  while (usedKeys.has(unique)) {
    index += 1
    unique = `${baseKey}_${index}`
  }

  usedKeys.add(unique)
  return unique
}

function slugifyKey(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return cleaned.length > 0 ? cleaned : DEFAULT_KEY_FALLBACK
}

function toLabelFromKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim()
  if (!spaced) {
    return "Custom field"
  }
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase())
}

function inferJsonType(value: Json): string {
  if (Array.isArray(value)) {
    return "multi-value"
  }
  if (value === null) {
    return "text"
  }
  if (typeof value === "object") {
    return "object"
  }
  return typeof value
}

function isNormalizedResponse(value: unknown): value is NormalizedCalcomResponse {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { label?: unknown }).label === "string" &&
    ("value" in (value as object))
  )
}

function toJson(value: unknown): Json {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (typeof value === "bigint") {
    return Number(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJson(entry)) as Json
  }

  if (isRecord(value)) {
    const record: { [key: string]: Json | undefined } = {}
    for (const [key, entry] of Object.entries(value)) {
      record[key] = toJson(entry)
    }
    return record
  }

  return String(value)
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
