export type DigestFrequency = "daily" | "weekly"

export interface NotificationPreferences {
  digestFrequency: DigestFrequency
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export interface NotificationPreferencesRow {
  digest_frequency: string | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  digestFrequency: "daily",
  quietHoursStart: null,
  quietHoursEnd: null,
}

const MINUTES_IN_DAY = 24 * 60

function clampTimeComponent(value: number, max: number) {
  if (Number.isNaN(value)) {
    return 0
  }
  return Math.min(Math.max(value, 0), max)
}

export function normalizeTimeInput(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const cleaned = value.trim()
  if (cleaned.length === 0) {
    return null
  }

  const parts = cleaned.split(":")
  if (parts.length < 2) {
    return null
  }

  const hours = clampTimeComponent(Number.parseInt(parts[0] ?? "", 10), 23)
  const minutes = clampTimeComponent(Number.parseInt(parts[1] ?? "", 10), 59)

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`
}

export function parseDbTime(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const parts = value.split(":")
  if (parts.length < 2) {
    return null
  }

  const hours = clampTimeComponent(Number.parseInt(parts[0] ?? "", 10), 23)
  const minutes = clampTimeComponent(Number.parseInt(parts[1] ?? "", 10), 59)

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`
}

export function coerceDigestFrequency(
  value: string | null | undefined,
): DigestFrequency {
  return value === "weekly" ? "weekly" : "daily"
}

function timeStringToMinutes(value: string): number | null {
  const normalized = normalizeTimeInput(value)
  if (!normalized) {
    return null
  }

  const [hours, minutes] = normalized.split(":")
  if (hours === undefined || minutes === undefined) {
    return null
  }

  const totalMinutes = Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10)
  return clampTimeComponent(totalMinutes, MINUTES_IN_DAY)
}

export function normalizePreferencesRow(
  row: Partial<NotificationPreferencesRow> | null | undefined,
): NotificationPreferences {
  if (!row) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  return {
    digestFrequency: coerceDigestFrequency(row.digest_frequency),
    quietHoursStart: parseDbTime(row.quiet_hours_start),
    quietHoursEnd: parseDbTime(row.quiet_hours_end),
  }
}

export function isWithinQuietHours(
  date: Date,
  preferences: NotificationPreferences,
): boolean {
  const startMinutes = preferences.quietHoursStart
    ? timeStringToMinutes(preferences.quietHoursStart)
    : null
  const endMinutes = preferences.quietHoursEnd
    ? timeStringToMinutes(preferences.quietHoursEnd)
    : null

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes === endMinutes
  ) {
    return false
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

export function shouldSuppressPush(
  date: Date,
  preferences: NotificationPreferences | null | undefined,
): boolean {
  if (!preferences) {
    return false
  }

  return isWithinQuietHours(date, preferences)
}

export function getQuietHoursResume(
  date: Date,
  preferences: NotificationPreferences,
): Date | null {
  if (!isWithinQuietHours(date, preferences)) {
    return null
  }

  const startMinutes = timeStringToMinutes(preferences.quietHoursStart ?? "")
  const endMinutes = timeStringToMinutes(preferences.quietHoursEnd ?? "")

  if (startMinutes === null || endMinutes === null) {
    return null
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes()
  const resume = new Date(date)
  resume.setSeconds(0, 0)

  if (startMinutes < endMinutes) {
    const diff = endMinutes - currentMinutes
    resume.setMinutes(resume.getMinutes() + diff)
    return resume
  }

  if (currentMinutes >= startMinutes) {
    const minutesUntilMidnight = MINUTES_IN_DAY - currentMinutes
    const total = minutesUntilMidnight + endMinutes
    resume.setMinutes(resume.getMinutes() + total)
    return resume
  }

  const diff = endMinutes - currentMinutes
  resume.setMinutes(resume.getMinutes() + diff)
  return resume
}
