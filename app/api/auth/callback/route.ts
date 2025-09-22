import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createCompressedJsonResponse } from '@/lib/http/compression'
import { createClient } from '@/utils/supa-server-actions'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const refreshToken = searchParams.get('refresh_token')

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return createCompressedJsonResponse(
      req,
      { error: 'User not found' },
      { status: 401 }
    )
  }

  const { error: tokenError } = await supabase
    .from('user_tokens')
    .upsert({ user_id: user.id, refresh_token: refreshToken })

  if (tokenError) {
    return createCompressedJsonResponse(
      req,
      { error: tokenError.message },
      { status: 500 }
    )
  }

  const redirectBase = process.env.NEXT_PUBLIC_BASE_URL ?? req.url
  const redirectUrl = new URL('/', redirectBase)

  return NextResponse.redirect(redirectUrl)
}
