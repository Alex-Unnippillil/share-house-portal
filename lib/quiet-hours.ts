import type { Tables } from "@/lib/supabase"

export type QuietHoursSettings = Pick<
  Tables<"household_settings">,
  "quiet_hours_start" | "quiet_hours_end" | "timezone" | "policy_message"
>

export const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: "UTC",
  policy_message:
    "Quiet hours are 10:00 PM – 7:00 AM. Please schedule visitor arrivals and departures outside this window.",
}

const MINUTES_IN_HOUR = 60

export function parseTimeToMinutes(timeValue: string): number {
  const [hourStr, minuteStr = "0"] = timeValue.split(":")
  const hours = Number.parseInt(hourStr, 10)
  const minutes = Number.parseInt(minuteStr, 10)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time value: ${timeValue}`)
  }

  return hours * MINUTES_IN_HOUR + minutes
}

export function getMinutesForDateInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: timezone,
    })

    const parts = formatter.formatToParts(date)
    const hourPart = parts.find((part) => part.type === "hour")
    const minutePart = parts.find((part) => part.type === "minute")

    const hours = Number.parseInt(hourPart?.value ?? "0", 10)
    const minutes = Number.parseInt(minutePart?.value ?? "0", 10)

    return hours * MINUTES_IN_HOUR + minutes
  } catch (error) {
    console.warn(`Failed to resolve timezone ${timezone}. Falling back to UTC.`, error)
    return date.getUTCHours() * MINUTES_IN_HOUR + date.getUTCMinutes()
  }
}

export function isMinutesWithinQuietHours(
  minutes: number,
  quietStartMinutes: number,
  quietEndMinutes: number
): boolean {
  if (quietStartMinutes === quietEndMinutes) {
    return false
  }

  if (quietStartMinutes < quietEndMinutes) {
    return minutes >= quietStartMinutes && minutes < quietEndMinutes
  }

  return minutes >= quietStartMinutes || minutes < quietEndMinutes
}

export function isDateWithinQuietHours(date: Date, settings: QuietHoursSettings): boolean {
  const quietStartMinutes = parseTimeToMinutes(settings.quiet_hours_start)
  const quietEndMinutes = parseTimeToMinutes(settings.quiet_hours_end)
  const minutes = getMinutesForDateInTimezone(date, settings.timezone)

  return isMinutesWithinQuietHours(minutes, quietStartMinutes, quietEndMinutes)
}

export function formatQuietHoursWindow(settings: QuietHoursSettings): string {
  const referenceDate = new Date(Date.UTC(2020, 0, 1))
  const start = new Date(referenceDate)
  const end = new Date(referenceDate)

  const [startHoursStr, startMinutesStr = "0"] = settings.quiet_hours_start.split(":")
  const [endHoursStr, endMinutesStr = "0"] = settings.quiet_hours_end.split(":")

  start.setUTCHours(Number(startHoursStr), Number(startMinutesStr), 0, 0)
  end.setUTCHours(Number(endHoursStr), Number(endMinutesStr), 0, 0)

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: settings.timezone,
  })

  const startLabel = formatter.format(start)
  const endLabel = formatter.format(end)

  return `${startLabel} – ${endLabel}`
}
