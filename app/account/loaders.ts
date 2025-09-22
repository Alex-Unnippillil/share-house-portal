"use server"

import "server-only"

import { cookies } from "next/headers"

import type { User } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

import { createClient } from "@/utils/supa-server-actions"

import type {
  AccountNotificationPreferences,
  AccountProfile,
} from "./types"

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "username" | "website" | "avatar_url" | "email" | "phone"
>

export interface AccountPageData {
  user: User | null
  profile: AccountProfile | null
  preferences: AccountNotificationPreferences
}

export async function loadAccountPageData(): Promise<AccountPageData> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      profile: null,
      preferences: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        smsPhoneNumber: null,
        pushSubscription: null,
      },
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, username, website, avatar_url, email, phone")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>()

  if (error) {
    console.error("Failed to load account profile", error)
  }

  const profile: AccountProfile | null = data
    ? {
        fullName: data.full_name,
        username: data.username,
        website: data.website,
        avatarUrl: data.avatar_url,
        email: data.email,
        phone: data.phone,
      }
    : null

  const { data: preferencesRow, error: preferencesError } = await supabase
    .from("notification_preferences")
    .select(
      "email_enabled, sms_enabled, push_enabled, sms_phone_number, push_subscription"
    )
    .eq("user_id", user.id)
    .maybeSingle<
      Database["public"]["Tables"]["notification_preferences"]["Row"]
    >()

  if (preferencesError && preferencesError.code !== "PGRST116") {
    console.error("Failed to load notification preferences", preferencesError)
  }

  const preferences: AccountNotificationPreferences = {
    emailEnabled: preferencesRow?.email_enabled ?? true,
    smsEnabled: preferencesRow?.sms_enabled ?? false,
    pushEnabled: preferencesRow?.push_enabled ?? false,
    smsPhoneNumber:
      preferencesRow?.sms_phone_number ?? profile?.phone ?? null,
    pushSubscription: (preferencesRow?.push_subscription as
      | AccountNotificationPreferences["pushSubscription"]
      | null) ?? null,
  }

  return { user, profile, preferences }
}
