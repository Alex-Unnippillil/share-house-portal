import type { Tables } from "@/lib/supabase"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizePreferencesRow,
  normalizeTimeInput,
  type NotificationPreferences,
} from "@/lib/notification-preferences"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const PREFERENCE_COLUMNS = "digest_frequency, quiet_hours_start, quiet_hours_end"
const PREFERENCE_COLUMNS_WITH_USER = `user_id, ${PREFERENCE_COLUMNS}`

type NotificationPreferencesTableRow = Tables<"notification_preferences">

export async function fetchNotificationPreferences(
  client: TypedSupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await client
    .from("notification_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<Pick<
      NotificationPreferencesTableRow,
      "digest_frequency" | "quiet_hours_start" | "quiet_hours_end"
    >>()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  return normalizePreferencesRow(data)
}

export async function saveNotificationPreferences(
  client: TypedSupabaseClient,
  userId: string,
  input: NotificationPreferences,
): Promise<NotificationPreferences> {
  const payload = {
    user_id: userId,
    digest_frequency: input.digestFrequency,
    quiet_hours_start: normalizeTimeInput(input.quietHoursStart) ?? null,
    quiet_hours_end: normalizeTimeInput(input.quietHoursEnd) ?? null,
  }

  const { data, error } = await client
    .from("notification_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select(PREFERENCE_COLUMNS)
    .maybeSingle<Pick<
      NotificationPreferencesTableRow,
      "digest_frequency" | "quiet_hours_start" | "quiet_hours_end"
    >>()

  if (error) {
    throw error
  }

  return normalizePreferencesRow(data ?? payload)
}

export interface UserNotificationPreferences {
  userId: string
  preferences: NotificationPreferences
}

export async function fetchAllNotificationPreferences(
  client: TypedSupabaseClient,
): Promise<UserNotificationPreferences[]> {
  const { data, error } = await client
    .from("notification_preferences")
    .select(PREFERENCE_COLUMNS_WITH_USER)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((row) => ({
    userId: row.user_id,
    preferences: normalizePreferencesRow(row),
  }))
}

export function withDefaultPreferences(
  preferences: NotificationPreferences | null | undefined,
): NotificationPreferences {
  if (!preferences) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  return preferences
}
