import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import type { Database } from "@/lib/supabase"

type SupabaseClientLike = Pick<TypedSupabaseClient, "from">

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"]

type AmenityBookingRow = Database["public"]["Tables"]["amenity_bookings"]["Row"]

type MemberRole = Database["public"]["Tables"]["profiles"]["Row"]["role"]

export type CommandPaletteResultItem = {
  id: string
  href: string
  title: string
  subtitle?: string
  type: "document" | "booking"
}

type SearchParams = {
  client: SupabaseClientLike
  query: string
  userId?: string | null
  role?: MemberRole | null
  limit?: number
}

function toSearchPattern(input: string) {
  const trimmed = input.trim()
  if (!trimmed) {
    return ""
  }

  return `%${trimmed.replaceAll("%", "").replaceAll("_", "")}%`
}

function toTitleCase(input: string | null | undefined) {
  if (!input) {
    return ""
  }

  return input
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function formatDocumentSubtitle(document: Pick<DocumentRow, "document_type" | "status" | "updated_at">) {
  const parts: string[] = []
  const typeLabel = toTitleCase(document.document_type)
  const statusLabel = toTitleCase(document.status)

  if (typeLabel) {
    parts.push(typeLabel)
  }

  if (statusLabel) {
    parts.push(statusLabel)
  }

  if (document.updated_at) {
    const updatedDate = new Date(document.updated_at)
    if (!Number.isNaN(updatedDate.getTime())) {
      parts.push(
        new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(updatedDate),
      )
    }
  }

  return parts.join(" • ")
}

function extractAmenityName(metadata: AmenityBookingRow["metadata"]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const record = metadata as Record<string, unknown>
  const amenityName = record["amenity_name"]

  return typeof amenityName === "string" ? amenityName : null
}

function formatBookingSubtitle(booking: Pick<AmenityBookingRow, "start_time" | "end_time" | "status">) {
  const start = booking.start_time ? new Date(booking.start_time) : null
  const end = booking.end_time ? new Date(booking.end_time) : null

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return toTitleCase(booking.status)
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  })
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  return [
    dateFormatter.format(start),
    `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
    toTitleCase(booking.status),
  ]
    .filter(Boolean)
    .join(" • ")
}

export async function searchDocumentsForCommandPalette({
  client,
  query,
  userId,
  role,
  limit = 5,
}: SearchParams): Promise<CommandPaletteResultItem[]> {
  const pattern = toSearchPattern(query)
  if (!pattern) {
    return []
  }

  let builder = client
    .from("documents")
    .select("id, title, document_type, status, updated_at, tenant_id", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(limit)
    .or(`title.ilike.${pattern},document_type.ilike.${pattern},status.ilike.${pattern}`)

  if (userId && role !== "property_manager" && role !== "admin") {
    builder = builder.eq("tenant_id", userId)
  }

  const { data, error } = await builder

  if (error) {
    throw new Error(`Failed to load documents: ${error.message}`)
  }

  return (data ?? []).map((document) => ({
    id: document.id,
    href: `/documents?documentId=${document.id}`,
    title: document.title,
    subtitle: formatDocumentSubtitle(document),
    type: "document" as const,
  }))
}

export async function searchBookingsForCommandPalette({
  client,
  query,
  userId,
  role,
  limit = 5,
}: SearchParams): Promise<CommandPaletteResultItem[]> {
  const pattern = toSearchPattern(query)
  if (!pattern) {
    return []
  }

  const nowIso = new Date().toISOString()

  let builder = client
    .from("amenity_bookings")
    .select("id, amenity_id, status, start_time, end_time, metadata, created_by")
    .order("start_time", { ascending: true })
    .gte("start_time", nowIso)
    .limit(limit)
    .or(
      `amenity_id.ilike.${pattern},status.ilike.${pattern},metadata->>amenity_name.ilike.${pattern}`,
    )

  if (userId && role !== "property_manager" && role !== "admin") {
    builder = builder.eq("created_by", userId)
  }

  const { data, error } = await builder

  if (error) {
    throw new Error(`Failed to load bookings: ${error.message}`)
  }

  return (data ?? []).map((booking) => {
    const amenityName = extractAmenityName(booking.metadata)

    return {
      id: booking.id,
      href: `/schedule?bookingId=${booking.id}`,
      title: amenityName || toTitleCase(booking.amenity_id) || "Amenity booking",
      subtitle: formatBookingSubtitle(booking),
      type: "booking" as const,
    }
  })
}
