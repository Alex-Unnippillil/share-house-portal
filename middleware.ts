// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Session } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_REDIRECT_PATH = '/auth'
const TENANT_REDIRECT_PATH = '/account'
const TENANT_ROLE = 'tenant'
const ADMIN_ROLE = 'admin'
const TENANT_ROUTE_GROUP_PATTERN = /\/\(tenant\)(\/|$)/i
const ADMIN_ROUTE_GROUP_PATTERN = /\/\(admin\)(\/|$)/i
const TENANT_PATH_PREFIX = /^\/tenant(\/|$)/i
const ADMIN_PATH_PREFIX = /^\/admin(\/|$)/i

export const PORTAL_CLAIM_NAMESPACE = 'https://share.house/claims'

type PortalClaim = {
  household_id: string
  roles: string[]
}

function decodeBase64Url(value: string): string {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalised.padEnd(
    normalised.length + ((4 - (normalised.length % 4)) % 4),
    '='
  )

  if (typeof atob === 'function') {
    return atob(padded)
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8')
  }

  throw new Error('No base64 decoder available in this runtime')
}

function normaliseJwtPayload(token: string | undefined): unknown {
  if (!token) return null

  const segments = token.split('.')
  if (segments.length < 2) return null

  try {
    const payload = segments[1]
    const decoded = decodeBase64Url(payload)
    return JSON.parse(decoded)
  } catch (error) {
    console.warn('Failed to decode Supabase access token payload', error)
    return null
  }
}

function isPortalClaim(value: unknown): value is PortalClaim {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const claim = value as Partial<PortalClaim>
  return (
    typeof claim.household_id === 'string' &&
    Array.isArray(claim.roles) &&
    claim.roles.every((role) => typeof role === 'string')
  )
}

function extractPortalClaim(session: Session | null): PortalClaim | null {
  if (!session) return null

  const payload = normaliseJwtPayload(session.access_token)

  const potentialSources: unknown[] = [
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)[PORTAL_CLAIM_NAMESPACE]
      : null,
    session.user?.app_metadata?.[PORTAL_CLAIM_NAMESPACE],
    session.user?.user_metadata?.[PORTAL_CLAIM_NAMESPACE],
  ]

  for (const source of potentialSources) {
    if (isPortalClaim(source)) {
      return source
    }
  }

  return null
}

function resolveInvokePath(request: NextRequest): string {
  const invokePath = request.headers.get('x-invoke-path')
  if (invokePath) {
    return invokePath
  }

  return request.nextUrl.pathname
}

function isTenantRoute(request: NextRequest): boolean {
  const path = resolveInvokePath(request)
  return (
    TENANT_ROUTE_GROUP_PATTERN.test(path) ||
    TENANT_PATH_PREFIX.test(request.nextUrl.pathname)
  )
}

function isAdminRoute(request: NextRequest): boolean {
  const path = resolveInvokePath(request)
  return (
    ADMIN_ROUTE_GROUP_PATTERN.test(path) ||
    ADMIN_PATH_PREFIX.test(request.nextUrl.pathname)
  )
}

function redirectTo(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(pathname, request.url))
}

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

  const claim = extractPortalClaim(session ?? null)
  const roles = claim?.roles ?? []

  const tenantRoute = isTenantRoute(request)
  const adminRoute = isAdminRoute(request)

  if ((tenantRoute || adminRoute) && !session) {
    return redirectTo(AUTH_REDIRECT_PATH, request)
  }

  if (tenantRoute && (!claim || !roles.includes(TENANT_ROLE))) {
    return redirectTo(TENANT_REDIRECT_PATH, request)
  }

  if (adminRoute && (!claim || !roles.includes(ADMIN_ROLE))) {
    return new NextResponse(null, { status: 403 })
  }

  if (claim) {
    response.headers.set('x-onyx-household-id', claim.household_id)
    response.headers.set('x-onyx-roles', roles.join(','))
  }

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