// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  extractBuildingIdFromPath,
  isRoleAuthorized,
  matchRouteRole,
  resolveActiveMembership,
} from '@/lib/auth/authorization'
import type { BuildingMembership } from '@/types/rbac'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const pathname = request.nextUrl.pathname
  const method = request.method
  const routeRule = matchRouteRole(pathname, method)

  if (!routeRule) {
    return response
  }

  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  const { data: membershipRows } = await supabase
    .from('user_roles')
    .select('building_id, building_slug, building_name, role, created_at')
    .order('building_name')

  const memberships: BuildingMembership[] = (membershipRows ?? []).map(
    (membership) => ({
      building_id: membership.building_id,
      building_slug: membership.building_slug,
      building_name: membership.building_name,
      role: membership.role,
      created_at: membership.created_at ?? undefined,
    })
  )

  if (!memberships.length && routeRule.buildingRequired) {
    return NextResponse.redirect(
      new URL('/onboarding?missingBuilding=1', request.url)
    )
  }

  const requestedBuildingId =
    request.headers.get('x-building-id') ??
    request.nextUrl.searchParams.get('buildingId') ??
    extractBuildingIdFromPath(pathname)

  const cookieBuildingId = request.cookies.get('active-building')?.value ?? null

  const activeMembership = resolveActiveMembership({
    memberships,
    requestedBuildingId,
    fallbackBuildingId: cookieBuildingId,
  })

  if (routeRule.buildingRequired && !activeMembership) {
    return NextResponse.redirect(
      new URL('/onboarding?missingBuilding=1', request.url)
    )
  }

  if (!isRoleAuthorized(activeMembership?.role, routeRule.roles)) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.redirect(new URL('/dashboard?unauthorized=1', request.url))
  }

  if (activeMembership) {
    if (cookieBuildingId !== activeMembership.building_id) {
      response.cookies.set({
        name: 'active-building',
        value: activeMembership.building_id,
        path: '/',
        sameSite: 'lax',
      })
    }

    response.headers.set('x-active-building-id', activeMembership.building_id)
    response.headers.set('x-active-role', activeMembership.role)
  }

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}