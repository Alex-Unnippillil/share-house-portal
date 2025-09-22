import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createCompressedJsonResponse } from '@/lib/http/compression'
import { createClient } from '@/utils/supa-server-actions'

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) {
        window.localStorage.setItem(
          'oauth_provider_token',
          session.provider_token
        )
      }

      if (session?.provider_refresh_token) {
        window.localStorage.setItem(
          'oauth_provider_refresh_token',
          session.provider_refresh_token
        )
      }

      if (event === 'SIGNED_OUT') {
        window.localStorage.removeItem('oauth_provider_token')
        window.localStorage.removeItem('oauth_provider_refresh_token')
      }
    })
  }

  const { searchParams, origin } = new URL(request.url)
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: process.env.GOOGLE_REDIRECT_URI ?? undefined,
    },
  })

  if (error) {
    return createCompressedJsonResponse(
      request,
      { error: error?.message ?? 'Unable to sign in with Google' },
      { status: 401 }
    )
  }

  if (data?.url) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
