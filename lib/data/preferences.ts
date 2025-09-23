import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

export type NotificationDigestFrequency =
  Database["public"]["Tables"]["profiles"]["Row"]["digest_frequency"]

export interface NotificationPreferencesInput {
  digestFrequency: NotificationDigestFrequency
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export interface PersistedNotificationPreferencesPayload {
  digest_frequency: NotificationDigestFrequency
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  updated_at: string
}

export function normalizeQuietHour(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === "") {
    return null
  }

  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) {
    throw new Error(`Invalid quiet hour value: ${value}`)
  }

  const [, hours, minutes, seconds] = match
  const hourNumber = Number.parseInt(hours, 10)
  const minuteNumber = Number.parseInt(minutes, 10)
  const secondValue = seconds ?? "00"

  if (
    Number.isNaN(hourNumber) ||
    Number.isNaN(minuteNumber) ||
    hourNumber < 0 ||
    hourNumber > 23 ||
    minuteNumber < 0 ||
    minuteNumber > 59
  ) {
    throw new Error(`Invalid quiet hour value: ${value}`)
  }

  return `${hours}:${minutes}:${secondValue}`
}

export async function persistNotificationPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
  preferences: NotificationPreferencesInput,
): Promise<PersistedNotificationPreferencesPayload> {
  const quietHoursStart = normalizeQuietHour(preferences.quietHoursStart)
  const quietHoursEnd = normalizeQuietHour(preferences.quietHoursEnd)

  const payload: PersistedNotificationPreferencesPayload = {
    digest_frequency: preferences.digestFrequency,
    quiet_hours_start: quietHoursStart,
    quiet_hours_end: quietHoursEnd,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update notification preferences: ${error.message}`)
  }

  return payload
}
