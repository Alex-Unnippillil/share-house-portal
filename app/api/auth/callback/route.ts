import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { timeDatabase, withServerTiming } from '@/lib/server-timing'
import { createClient } from '@/utils/supa-server-actions'

async function handleAuthCallback(request: Request) {
  const { searchParams } = new URL(request.url)
  const refreshToken = searchParams.get('refresh_token')

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError,
  } = await timeDatabase('supabase.auth.getUser', () => supabase.auth.getUser())

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  const { error: tokenError } = await timeDatabase('user_tokens.upsert', () =>
    supabase
      .from('user_tokens')
      .upsert({ user_id: user.id, refresh_token: refreshToken })
  )

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 })
  }

  const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_BASE_URL)
  return NextResponse.redirect(redirectUrl)
}

export const GET = withServerTiming(handleAuthCallback, 'api.auth.callback')
