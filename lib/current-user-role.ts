import "server-only"

import type { AppRole } from "@/lib/auth-rbac"
import { createClient } from "@/utils/supabase/server"

export async function getCurrentUserRole(): Promise<AppRole | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  return profile?.role ?? "tenant"
}
