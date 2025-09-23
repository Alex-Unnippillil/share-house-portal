import type { ReactNode } from "react"

import { cookies } from "next/headers"

import Breadcrumbs from "@/components/navigation/Breadcrumbs"
import createSupabaseServer from "@/utils/supabase-server"

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

async function resolveBookingLabel(bookingId: string): Promise<string | null> {
  if (!bookingId) {
    return null
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }

  try {
    const supabase = createSupabaseServer(cookies())
    const { data, error } = await supabase
      .from("amenity_bookings")
      .select("metadata,start_time")
      .eq("id", bookingId)
      .maybeSingle()

    if (error) {
      return null
    }

    if (data) {
      if (isRecord(data.metadata)) {
        const metadataTitle = data.metadata?.title
        if (hasText(metadataTitle)) {
          return metadataTitle
        }
      }

      if (hasText(data.start_time)) {
        const startDate = new Date(data.start_time)
        if (!Number.isNaN(startDate.valueOf())) {
          const formatted = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(startDate)
          return `Booking • ${formatted}`
        }
      }
    }
  } catch (error) {
    return null
  }

  return null
}

const formatBookingFallback = (bookingId: string) =>
  `Booking ${bookingId.slice(0, 8).toUpperCase()}`

export default async function BookingsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { bookingId?: string }
}) {
  const bookingId = params?.bookingId
  const resolvedLabel = bookingId ? await resolveBookingLabel(bookingId) : null
  const segmentLabels = bookingId
    ? { [bookingId]: resolvedLabel ?? formatBookingFallback(bookingId) }
    : undefined

  return (
    <>
      <div className="container max-w-7xl pb-4 pt-6">
        <Breadcrumbs segmentLabels={segmentLabels} />
      </div>
      {children}
    </>
  )
}
