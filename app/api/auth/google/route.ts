import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { jsonError } from "@/lib/errors"
import { createServerClient } from "@/lib/supabase-client"

const DEFAULT_REDIRECT_PATH = "/"

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)

  const url = new URL(request.url)
  const next = url.searchParams.get("next") ?? DEFAULT_REDIRECT_PATH

  const redirectTo =
    process.env.GOOGLE_REDIRECT_URI ??
    `${url.origin}/api/auth/callback?next=${encodeURIComponent(next)}`

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
