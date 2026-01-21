import type { PostgrestError } from "@supabase/supabase-js"

export const DAILY_LIMIT_DETAIL = "BOOKING_QUOTA_DAILY_LIMIT"
export const WEEKLY_LIMIT_DETAIL = "BOOKING_QUOTA_WEEKLY_LIMIT"

const LIMIT_REGEX = /(\d+)/

function extractLimit(message: string | null | undefined): number | null {
  if (!message) {
    return null
  }

  const match = message.match(LIMIT_REGEX)
  if (!match) {
    return null
  }

  const value = Number.parseInt(match[1]!, 10)
  return Number.isNaN(value) ? null : value
}

type SupportedError = Pick<PostgrestError, "code" | "details" | "message"> | null | undefined

export function translateBookingQuotaError(error: SupportedError): string | null {
  if (!error || error.code !== "P0001") {
    return null
  }

  const limit = extractLimit(error.message)

  switch (error.details) {
    case DAILY_LIMIT_DETAIL: {
      const limitText = limit
        ? `${limit} daily reservation${limit > 1 ? "s" : ""}`
        : "the allowed number of daily bookings"

      return `You have reached your daily booking quota (${limitText}). Try another day or cancel an existing reservation first.`
    }
    case WEEKLY_LIMIT_DETAIL: {
      const limitText = limit
        ? `${limit} weekly booking${limit > 1 ? "s" : ""}`
        : "the allowed number of bookings this week"

      return `You have reached your weekly booking quota (${limitText}). Consider a later week or free up a slot before adding a new booking.`
    }
    default:
      return null
  }
}
