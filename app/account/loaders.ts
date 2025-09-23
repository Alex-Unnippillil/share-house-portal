"use server"

import "server-only"

import { cookies } from "next/headers"

import type { User } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

import { createClient } from "@/utils/supa-server-actions"

import type { AccountProfile } from "./types"

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "username" | "website" | "avatar_url" | "email" | "updated_at"
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
    .select("full_name, username, website, avatar_url, email, updated_at")
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
        updatedAt: data.updated_at,
      }
    : null

  return { user, profile }
}
