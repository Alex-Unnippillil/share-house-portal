// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { type User } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { enforcePlanRateLimit } from '@/lib/rate-limit/enforcer'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  let supabaseUser: User | null = null
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    supabaseUser = user ?? null
  } catch {
    supabaseUser = null
  }

  const rateLimitResult = await enforcePlanRateLimit({
    request,
    user: supabaseUser,
  })

  if (rateLimitResult.blocked && rateLimitResult.response) {
    propagateCookies(response, rateLimitResult.response)
    return rateLimitResult.response
  }

  if (rateLimitResult.headers) {
    for (const [key, value] of Object.entries(rateLimitResult.headers)) {
      if (typeof value === 'string') {
        response.headers.set(key, value)
      }
    }
  }

  return response
}

function propagateCookies(source: NextResponse, target: NextResponse) {
  try {
    for (const cookie of source.cookies.getAll()) {
      target.cookies.set(cookie)
    }
  } catch {
    // Ignore propagation errors; cookies are a best-effort copy.
  }
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
    '/api/:path*',
  ],
}