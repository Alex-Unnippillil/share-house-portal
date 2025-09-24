import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { recordAuditLog } from "@/lib/audit-logs"
import {
  IMPERSONATION_COOKIE_NAME,
  ImpersonationError,
  startImpersonationSession,
} from "@/lib/admin/impersonation"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const startSchema = z.object({
  targetUserId: z.string().uuid(),
})

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

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const validation = startSchema.safeParse(payload)
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid impersonation request", details: validation.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const auditContext = extractAuditContext(request)
    const result = await startImpersonationSession({
      client: supabase,
      impersonatorId: user.id,
      targetUserId: validation.data.targetUserId,
      auditContext,
    })

    const { error: metadataError } = await supabase.auth.updateUser({
      data: result.metadataUpdate,
    })

    if (metadataError) {
      return NextResponse.json(
        { error: "Failed to tag impersonation metadata" },
        { status: 500 }
      )
    }

    try {
      await recordAuditLog(supabase, result.auditEntry)
    } catch (error) {
      await supabase.auth.updateUser({ data: { impersonation: null } })
      throw error
    }

    const response = NextResponse.json({
      success: true,
      impersonation: {
        targetUserId: result.session.targetUserId,
        targetName: result.session.targetName,
        targetEmail: result.session.targetEmail,
        startedAt: result.session.startedAt,
      },
    })

    response.cookies.set({
      name: IMPERSONATION_COOKIE_NAME,
      value: result.cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    return response
  } catch (error) {
    if (error instanceof ImpersonationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("Failed to start impersonation", error)
    return NextResponse.json(
      { error: "Unable to start impersonation" },
      { status: 500 }
    )
  }
}
