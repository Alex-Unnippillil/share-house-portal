// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  evaluateTenantSecurity,
  resolveClientIp,
} from '@/lib/security/tenant-policy'

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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('ip_allow_cidrs, session_ttl_seconds')
      .eq('id', user.id)
      .maybeSingle()

    if (!error && profile) {
      const evaluation = evaluateTenantSecurity({
        requestIp: resolveClientIp(request.headers, request.ip ?? null),
        allowedCidrs: profile.ip_allow_cidrs,
        sessionTtlSeconds: profile.session_ttl_seconds,
        lastSignInAt: user.last_sign_in_at ?? null,
      })

      if (!evaluation.allowed) {
        const message =
          evaluation.reason === 'ip'
            ? 'Access denied from this network. Contact your property manager to update the allowlist.'
            : 'Your session has expired based on household security settings. Please sign in again.'

        return NextResponse.json(
          {
            error: 'tenant_security_blocked',
            reason: evaluation.reason,
            message,
          },
          { status: 403 }
        )
      }
    }
  }

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