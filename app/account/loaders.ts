"use server"

import "server-only"

import { cookies } from "next/headers"

import type { User } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

import { createClient } from "@/utils/supa-server-actions"

import type { AccountProfile } from "./types"

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "username" | "website" | "avatar_url" | "email" | "timezone" | "locale"
>

export interface AccountPageData {
  user: User | null
  profile: AccountProfile | null
}

export async function loadAccountPageData(): Promise<AccountPageData> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, username, website, avatar_url, email, timezone, locale")
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
        timezone: data.timezone,
        locale: data.locale,
      }
    : null

  return { user, profile }
}

export async function loadUserPreferences(): Promise<{
  locale: string | null
  timezone: string | null
}> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { locale: null, timezone: null }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("locale, timezone")
    .eq("id", user.id)
    .maybeSingle<{ locale: string | null; timezone: string | null }>()

  if (error) {
    console.error("Failed to load user preferences", error)
    return { locale: null, timezone: null }
  }

  return {
    locale: data?.locale ?? null,
    timezone: data?.timezone ?? null,
  }
}
