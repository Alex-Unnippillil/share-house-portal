import { NextResponse } from 'next/server'

import { getTrustedRedirectBase, sanitizeNextPath } from '@/lib/auth/redirects'
// The client you created from the Server-Side Auth instructions
import { createSupbaseServerClient } from '@/utils/supaone'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = sanitizeNextPath(url.searchParams.get('next'))
  const redirectBase = getTrustedRedirectBase(request)

  if (code) {
    const supabase = await createSupbaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const targetUrl = new URL(next, redirectBase)
      return NextResponse.redirect(targetUrl)
    }
  }
  // return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', redirectBase))
}
