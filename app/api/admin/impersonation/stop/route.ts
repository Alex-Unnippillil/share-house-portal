import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { recordAuditLog } from "@/lib/audit-logs"
import {
  IMPERSONATION_COOKIE_NAME,
  ImpersonationError,
  decodeImpersonationCookie,
  stopImpersonationSession,
} from "@/lib/admin/impersonation"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

function extractAuditContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ipAddress = forwardedFor
    ? forwardedFor.split(",")[0]?.trim() ?? null
    : request.headers.get("x-real-ip")

  return {
    ipAddress: ipAddress ?? null,
    userAgent: request.headers.get("user-agent"),
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as SupabaseClient<Database>

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existingSession = decodeImpersonationCookie(
    cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value
  )

  if (!existingSession) {
    return NextResponse.json(
      { error: "No active impersonation session" },
      { status: 400 }
    )
  }

  try {
    const auditContext = extractAuditContext(request)
    const result = await stopImpersonationSession({
      client: supabase,
      impersonatorId: user.id,
      session: existingSession,
      auditContext,
    })

    const { error: metadataError } = await supabase.auth.updateUser({
      data: result.metadataUpdate,
    })

    if (metadataError) {
      return NextResponse.json(
        { error: "Failed to clear impersonation metadata" },
        { status: 500 }
      )
    }

    try {
      await recordAuditLog(supabase, result.auditEntry)
    } catch (error) {
      await supabase.auth.updateUser({
        data: {
          impersonation: {
            active: true,
            started_at: existingSession.startedAt,
            target_user_id: existingSession.targetUserId,
            target_email: existingSession.targetEmail,
            target_name: existingSession.targetName,
          },
        },
      })
      throw error
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set({
      name: IMPERSONATION_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch (error) {
    if (error instanceof ImpersonationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("Failed to stop impersonation", error)
    return NextResponse.json(
      { error: "Unable to stop impersonation" },
      { status: 500 }
    )
  }
}
