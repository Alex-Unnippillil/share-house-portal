// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  computeCookieSecurityContext,
  withSupabaseCookieDefaults,
} from '@/utils/supabase/cookie-helpers'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const securityContext = computeCookieSecurityContext({
    envDomain: process.env.SUPABASE_COOKIE_DOMAIN,
    forwardedHost: request.headers.get('x-forwarded-host'),
    host: request.headers.get('host'),
    protocol:
      request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol,
    allowInsecure: process.env.SUPABASE_ALLOW_INSECURE_COOKIES === 'true',
    defaultSecure: process.env.NODE_ENV !== 'development',
  })

  const applyCookieDefaults = (options: CookieOptions) =>
    withSupabaseCookieDefaults(options, securityContext)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          const normalized = applyCookieDefaults(options)
          request.cookies.set({
            name,
            value,
            ...normalized,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...normalized,
          })
        },
        remove(name: string, options: CookieOptions) {
          const normalized = applyCookieDefaults(options)
          request.cookies.set({
            name,
            value: '',
            ...normalized,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...normalized,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
