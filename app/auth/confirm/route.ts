import { type EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getTrustedRedirectBase, sanitizeNextPath } from '@/lib/auth/redirects'
import { createSupbaseServerClient } from '@/utils/supaone'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash_searchParam = searchParams.get('token_hash')
  const code = searchParams.get('code')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNextPath(searchParams.get('next'))
  const redirectBase = getTrustedRedirectBase(request)

  const token_hash = code ?? token_hash_searchParam

  let redirectUrl = new URL(next, redirectBase)

  if (token_hash && type) {
    const supabase = await createSupbaseServerClient()

    const { data } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (data) {
      redirectUrl.searchParams.set(
        'message',
        encodeURIComponent('You can now sign in.'),
      )
    } else {
      // Instead of redirecting to error page, go to root with error message
      redirectUrl = new URL('/', redirectBase)
      redirectUrl.searchParams.set(
        'error',
        encodeURIComponent('Authentication failed. Please try again.'),
      )
    }
  } else {
    // No valid token or type, go to root with error message
    redirectUrl = new URL('/', redirectBase)
    redirectUrl.searchParams.set(
      'error',
      encodeURIComponent('Invalid authentication attempt. Please try again.'),
    )
  }

  // Clean up unnecessary parameters
  redirectUrl.searchParams.delete('token_hash')
  redirectUrl.searchParams.delete('code')
  redirectUrl.searchParams.delete('type')
  redirectUrl.searchParams.delete('next')

  return NextResponse.redirect(redirectUrl)
}
