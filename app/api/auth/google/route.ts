import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { createClient } from "@/utils/supa-server-actions"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(request, {
    limit: 10,
    window: 60,
    prefix: "auth-google",
    metadata: {
      route: "app/api/auth/google"
    }
  })

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get("next") ?? "/"
  const redirectTo = process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "consent"
      },
      redirectTo
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (data?.url) {
    return NextResponse.redirect(data.url)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
