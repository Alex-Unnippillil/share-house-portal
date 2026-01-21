"use server"

import "server-only"

import { cookies } from "next/headers"

import type { User } from "@supabase/supabase-js"

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizePreferencesRow,
  type NotificationPreferences,
} from "@/lib/notification-preferences"
import { createClient } from "@/utils/supa-server-actions"

export interface NotificationPreferencesPageData {
  user: User | null
  preferences: NotificationPreferences
}

export async function loadNotificationPreferencesPage(): Promise<NotificationPreferencesPageData> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    }
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("digest_frequency, quiet_hours_start, quiet_hours_end")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error("Failed to load notification preferences", error)
  }

  const preferences = data
    ? normalizePreferencesRow(data)
    : { ...DEFAULT_NOTIFICATION_PREFERENCES }

  return { user, preferences }
}
