import dynamic from "next/dynamic"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { createClient } from "@/utils/supa-server-actions"

type AmenityRecord = {
  id: string
  name: string
  description: string | null
  calcom_event_type_id: string | null
}

const AmenityBookingEmbed = dynamic(() => import("./cal-embed"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[640px] w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Loading amenity scheduler…
    </div>
  ),
})

function formatAmenityName(slug: string) {
  const parts = slug
    .split(/[-_]/g)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) {
    return "Amenity"
  }

  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}

export default async function AmenityPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  let amenity: AmenityRecord | null = null
  let eventTypeId: string | null = null

  try {
    const { data, error } = await supabase
      .from("amenities")
      .select("id, name, description, calcom_event_type_id")
      .eq("id", params.id)
      .maybeSingle()

    if (error) {
      console.error("Failed to load amenity from Supabase", error)
    } else if (data) {
      amenity = data
      eventTypeId = data.calcom_event_type_id
    }
  } catch (error) {
    console.error("Unexpected error while loading amenity", error)
  }

  const fallbackEventTypeId = process.env.CALCOM_MOCK_EVENT_TYPE_ID ?? null
  if (!eventTypeId && fallbackEventTypeId) {
    eventTypeId = fallbackEventTypeId
  }

  if (!amenity) {
    if (!eventTypeId) {
      notFound()
    }

    amenity = {
      id: params.id,
      name: formatAmenityName(params.id),
      description: null,
      calcom_event_type_id: eventTypeId,
    }
  }

  const calOrigin =
    process.env.NEXT_PUBLIC_CALCOM_BASE_URL?.replace(/\/$/, "") ?? "https://app.cal.com"

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{amenity.name}</h1>
        <p className="text-base text-muted-foreground">
          {amenity.description ??
            "Reserve this shared amenity and keep everyone in sync with real-time availability."}
        </p>
      </header>

      {eventTypeId ? (
        <AmenityBookingEmbed eventTypeId={eventTypeId} origin={calOrigin} />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          This amenity is not connected to Cal.com yet. Please reach out to your property manager.
        </div>
      )}
    </div>
  )
}
