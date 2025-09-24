import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { timeExternal, withServerTiming } from '@/lib/server-timing'
import { createClient } from '@/utils/supa-server-actions'

async function handleGoogleAuth(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/'

  const { error, data } = await timeExternal(
    'supabase.auth.signInWithOAuth',
    () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: process.env.GOOGLE_REDIRECT_URI,
        },
      })
  )

  if (error) {
    return NextResponse.json({ error: error?.message }, { status: 401 })
  }

  if (data?.url) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.json({ error: 'Unable to initiate Google Sign-In' }, { status: 500 })
}

export const GET = withServerTiming(handleGoogleAuth, 'api.auth.google')
