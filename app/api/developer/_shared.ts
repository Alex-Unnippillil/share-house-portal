import { NextResponse } from "next/server"

import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supabase/server"

export type AdminCheckResult = { userId: string } | { response: Response }

export async function ensureDeveloperAdmin(): Promise<AdminCheckResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn("[developer] Unauthorized attempt to manage OAuth clients")
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  type ProfileRole =
    Database["public"]["Tables"]["profiles"]["Row"]["role"] | null | undefined

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: ProfileRole }>()

  if (profileError) {
    console.error(
      "[developer] Failed to load profile while enforcing developer RBAC",
      profileError
    )
    return {
      response: NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      ),
    }
  }

  if (!profile || profile.role !== "admin") {
    console.warn("[developer] Non-admin attempted to manage OAuth clients", {
      userId: user.id,
      role: profile?.role ?? null,
    })
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { userId: user.id }
}
