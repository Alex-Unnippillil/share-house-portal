import { cookies } from "next/headers"

import { createClient } from "@/utils/supa-server-actions"

export type UserRole = string | null

export async function fetchCurrentUserRole(): Promise<UserRole> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error fetching profile role:", profileError)
    return null
  }

  return data?.role ?? null
}
