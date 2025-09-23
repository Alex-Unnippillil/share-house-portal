import type { User } from "@supabase/supabase-js"

import { fetchMemberRole, type MemberRole } from "@/lib/data/members"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createClient } from "@/utils/supabase/server"

export const DEFAULT_PAYMENT_ALLOWED_ROLES: MemberRole[] = [
  "tenant",
  "roommate",
  "property_manager",
  "admin",
]

type AuthSuccess = {
  success: true
  user: User
  role: MemberRole
}

type AuthFailure = {
  success: false
  response: Response
}

export async function authenticatePaymentRequest(
  allowedRoles: MemberRole[] = DEFAULT_PAYMENT_ALLOWED_ROLES,
): Promise<AuthSuccess | AuthFailure> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  let role: MemberRole | null = null
  try {
    role = await fetchMemberRole(
      supabase as unknown as TypedSupabaseClient,
      user.id,
    )
  } catch (error) {
    console.error("Failed to resolve member role", error)
    return {
      success: false,
      response: Response.json(
        { error: "Unable to verify permissions" },
        { status: 500 },
      ),
    }
  }

  if (!role || !allowedRoles.includes(role)) {
    return {
      success: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    success: true,
    user,
    role,
  }
}
