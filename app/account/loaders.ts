"use server"

import "server-only"

import { cookies, headers } from "next/headers"

import type { User } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

import { createClient } from "@/utils/supa-server-actions"
import { getLogger, withRequestContext } from "@/lib/logger"

import type { AccountProfile } from "./types"

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "username" | "website" | "avatar_url" | "email"
>

export interface AccountPageData {
  user: User | null
  profile: AccountProfile | null
}

const log = getLogger({ module: "account.loaders" })

export async function loadAccountPageData(): Promise<AccountPageData> {
  const requestHeaders = headers()

  return withRequestContext(
    async () => {
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
        .select("full_name, username, website, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>()

      if (error) {
        log.error({ error }, "Failed to load account profile")
      }

      const profile: AccountProfile | null = data
        ? {
            fullName: data.full_name,
            username: data.username,
            website: data.website,
            avatarUrl: data.avatar_url,
            email: data.email,
          }
        : null

      return { user, profile }
    },
    { headers: requestHeaders }
  )
}
