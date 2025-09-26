import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { saveRefreshToken } from "@/lib/refresh-tokens"
import { createClient } from "@/utils/supa-server-actions"

const DEFAULT_REDIRECT_PATH = "/"

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const url = new URL(request.url)
    const { searchParams } = url
    const refreshToken = searchParams.get("refresh_token")

    if (!refreshToken) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "refresh_token is required",
      })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: userError?.message ?? "User not found",
      })
    }

    try {
      await saveRefreshToken(supabase, user.id, refreshToken)
    } catch (error) {
      return jsonError("DATA_FETCH_FAILED", {
        message: "Failed to persist refresh token",
        details: { reason: error instanceof Error ? error.message : String(error) },
      })
    }

    const nextPath = searchParams.get("next") ?? DEFAULT_REDIRECT_PATH
    const redirectBase =
      process.env.NEXT_PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`
    const redirectUrl = new URL(nextPath, redirectBase)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    return jsonErrorFromUnknown(error)
  }
}
