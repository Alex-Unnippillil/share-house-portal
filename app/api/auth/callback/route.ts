import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { createClient } from "@/utils/supa-server-actions"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(request, {
    limit: 20,
    window: 60,
    prefix: "auth-callback",
    metadata: {
      route: "app/api/auth/callback"
    }
  })

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const { searchParams } = new URL(request.url)
  const refreshToken = searchParams.get("refresh_token")

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 })
  }

  const { error: tokenError } = await supabase
    .from("user_tokens")
    .upsert({ user_id: user.id, refresh_token: refreshToken })

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 })
  }

  const redirectUrl = new URL("/", process.env.NEXT_PUBLIC_BASE_URL)

  return NextResponse.redirect(redirectUrl)
}
