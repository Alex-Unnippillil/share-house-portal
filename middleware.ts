// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { NextResponse, type NextRequest } from 'next/server'

import {
  isPublicRoute,
  isRouteAllowedForRole,
  requiresAuthentication,
  resolveSessionRole,
} from '@/lib/auth-rbac'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  const { supabase, response, user } = await updateSession(request)

  if (!user && requiresAuthentication(pathname)) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/auth'
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
      source: '/((?!api|_next/static|_next/image|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
