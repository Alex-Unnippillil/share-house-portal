// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  isPublicRoute,
  isRouteAllowedForRole,
  requiresAuthentication,
  resolveSessionRole,
} from '@/lib/auth-rbac'
import {
  isDemoArtifactRoute,
  isInternalRoutesEnabled,
  isInternalToolingRoute,
} from '@/lib/route-governance'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isDemoArtifactRoute(pathname)) {
    const notFoundUrl = request.nextUrl.clone()
    notFoundUrl.pathname = '/auth'
    notFoundUrl.searchParams.set('blocked', '1')

    return NextResponse.redirect(notFoundUrl)
  }

  if (isInternalToolingRoute(pathname) && !isInternalRoutesEnabled()) {
    const notFoundUrl = request.nextUrl.clone()
    notFoundUrl.pathname = '/auth'
    notFoundUrl.searchParams.set('internal', '1')

    return NextResponse.redirect(notFoundUrl)
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

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
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && requiresAuthentication(pathname)) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/auth/signin'
    signInUrl.searchParams.set('redirectTo', pathname)

    return NextResponse.redirect(signInUrl)
  }

  if (!user) {
    return response
  }

  const role = await resolveSessionRole(supabase, user)

  if (!isRouteAllowedForRole(pathname, role)) {
    const deniedUrl = request.nextUrl.clone()
    deniedUrl.pathname = '/dashboard'
    deniedUrl.searchParams.set('denied', '1')

    return NextResponse.redirect(deniedUrl)
  }

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
