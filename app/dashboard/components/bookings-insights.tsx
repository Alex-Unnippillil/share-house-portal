import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { coerceBookingMetadata, type BookingMetadata } from "@/lib/calcom"
import type { BookingRow } from "@/lib/calcom"
import type { Json } from "@/lib/supabase"
import { createClient } from "@/utils/supabase/server"

const EXCLUDED_METADATA_KEYS = new Set(["event_title", "event_slug", "last_calcom_event"])

function formatMetadataValue(value: Json): string {
  if (Array.isArray(value)) {
    return value.map((entry) => formatMetadataValue(entry as Json)).join(", ") || "—"
  }

  if (value === null) {
    return "—"
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  return String(value)
}

function formatStartTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function getDisplayableMetadata(metadata: BookingMetadata) {
  return Object.entries(metadata)
    .filter(([key]) => !EXCLUDED_METADATA_KEYS.has(key))
    .slice(0, 3)
}

function getAttendeeSummary(booking: BookingRow) {
  if (booking.attendee_name) {
    return booking.attendee_email
      ? `${booking.attendee_name} · ${booking.attendee_email}`
      : booking.attendee_name
  }

  return booking.attendee_email ?? "—"
}

function hasSupabaseCredentials() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function BookingsInsightsCard() {
  if (!hasSupabaseCredentials()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Cal.com bookings</CardTitle>
          <CardDescription>Configure Supabase credentials to load booking metadata.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const client = createClient()
  const { data, error } = await client
    .from("bookings")
    .select("calcom_booking_id, start_time, event_slug, attendee_name, attendee_email, status, metadata")
    .order("start_time", { ascending: false })
    .limit(5)

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Cal.com bookings</CardTitle>
          <CardDescription>We were unable to load booking metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Cal.com bookings</CardTitle>
          <CardDescription>No bookings have been synced from Cal.com yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Cal.com bookings</CardTitle>
        <CardDescription>Custom responses captured from the latest amenity reservations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((booking) => {
          const metadata = coerceBookingMetadata(booking.metadata)
          const displayableMetadata = getDisplayableMetadata(metadata)

          return (
            <div key={booking.calcom_booking_id} className="rounded-md border border-muted p-4">
              <div className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>
                  {(booking.event_slug ?? "amenity").replace(/[-_]+/g, " ")}
                  <span className="text-muted-foreground"> · {formatStartTime(booking.start_time)}</span>
                </span>
                {booking.status ? (
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{booking.status}</span>
                ) : null}
              </div>
              <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-foreground">Attendee</dt>
                  <dd className="text-right">{getAttendeeSummary(booking)}</dd>
                </div>
                {displayableMetadata.length ? (
                  displayableMetadata.map(([key, entry]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="font-medium text-foreground">{entry.label}</dt>
                      <dd className="text-right">{formatMetadataValue(entry.value)}</dd>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-foreground">Responses</dt>
                    <dd className="text-right">No custom responses</dd>
                  </div>
                )}
              </dl>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
