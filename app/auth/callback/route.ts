import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createSupbaseServerClient } from '@/utils/supaone'
import { runWithQueryContext } from '@/utils/observability/query-context'

export async function GET(request: Request) {
  return runWithQueryContext(
    {
      traceId: randomUUID(),
      route: 'app/auth/callback#GET',
      actor: 'auth-callback-route',
    },
    async () => {
      const { searchParams, origin } = new URL(request.url)
      const code = searchParams.get('code')
      // if "next" is in param, use it as the redirect URL
      const next = searchParams.get('next') ?? '/'
      if (code) {
        const supabase = createSupbaseServerClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
          const isLocalEnv = process.env.NODE_ENV === 'development'
          if (isLocalEnv) {
            // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
            return NextResponse.redirect(`${origin}${next}`)
          }
          if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`)
          }
          return NextResponse.redirect(`${origin}${next}`)
        }
      }
      // return the user to an error page with instructions
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  )
}