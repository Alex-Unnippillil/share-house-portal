import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getTrustedRedirectBase, sanitizeNextPath } from "@/lib/auth/redirects"
import { jsonError } from "@/lib/errors"
import { createClient } from "@/utils/supa-server-actions"

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const url = new URL(request.url)
  const next = sanitizeNextPath(url.searchParams.get("next"))
  const redirectBase = getTrustedRedirectBase(request)

  const callbackUrl = new URL("/api/auth/callback", redirectBase)
  callbackUrl.searchParams.set("next", next)

  const redirectTo = process.env.GOOGLE_REDIRECT_URI ?? callbackUrl.toString()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      redirectTo,
    },
  })

  if (error) {
    return jsonError("AUTH_UNAUTHORIZED", { message: error.message })
  }

  if (!data?.url) {
    return jsonError("INTERNAL_SERVER_ERROR", {
      message: "Unable to initiate Google OAuth flow",
    })
  }

  return NextResponse.redirect(data.url)
}
