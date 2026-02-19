import { jsonError } from "@/lib/errors"
import { createClient } from "@/utils/supabase/server"

const PRIVILEGED_ROLES = new Set(["property_manager", "admin"])

type AuthenticatedApiContext = {
  supabase: ReturnType<typeof createClient>
  userId: string
}

type PrivilegedApiContext = AuthenticatedApiContext & {
  role: string
}

export async function requireApiAuth(): Promise<AuthenticatedApiContext | Response> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return jsonError("AUTH_UNAUTHORIZED")
  }

  return {
    supabase,
    userId: user.id,
  }
}

export async function requirePrivilegedApiAccess(): Promise<PrivilegedApiContext | Response> {
  const authContext = await requireApiAuth()

  if (authContext instanceof Response) {
    return authContext
  }

  const { supabase, userId } = authContext
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    return jsonError("DATA_FETCH_FAILED", {
      message: "Unable to load the current user's role.",
      details: { reason: profileError.message },
    })
  }

  const role = profile?.role ?? ""
  if (!PRIVILEGED_ROLES.has(role)) {
    return jsonError("AUTH_UNAUTHORIZED", {
      message: "Only property managers and admins can access this endpoint.",
    })
  }

  return {
    supabase,
    userId,
    role,
  }
}
