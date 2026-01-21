// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_EDGE_ROUTES: Array<RegExp> = [
  /^\/$/,
  /^\/about(?:\/.*)?$/,
  /^\/contact(?:\/.*)?$/,
  /^\/privacy(?:\/.*)?$/,
  /^\/terms(?:\/.*)?$/,
]

const PUBLIC_EDGE_MAX_AGE_SECONDS = 60 * 5
const PUBLIC_EDGE_STALE_SECONDS = 60 * 10
const PUBLIC_CACHE_CONTROL = `public, s-maxage=${PUBLIC_EDGE_MAX_AGE_SECONDS}, stale-while-revalidate=${PUBLIC_EDGE_STALE_SECONDS}`
const PRIVATE_CACHE_CONTROL = 'private, no-store, max-age=0, must-revalidate'

const DEFAULT_VARY_HEADERS = [
  'RSC',
  'Next-Router-State-Tree',
  'Next-Router-Prefetch',
  'Authorization',
  'Cookie',
]

const resolveTenantId = (user: User | null | undefined): string | null => {
  if (!user) {
    return null
  }

  const fromAppMetadata = user.app_metadata
    ? (user.app_metadata as Record<string, unknown>).tenant_id
    : undefined

  if (typeof fromAppMetadata === 'string' && fromAppMetadata.length > 0) {
    return fromAppMetadata
  }

  const fromUserMetadata = user.user_metadata
    ? (user.user_metadata as Record<string, unknown>).tenant_id
    : undefined

  if (typeof fromUserMetadata === 'string' && fromUserMetadata.length > 0) {
    return fromUserMetadata
  }

  return null
}

const shouldApplyPublicEdgeCache = (
  request: NextRequest,
  isAuthenticated: boolean
): boolean => {
  if (isAuthenticated) {
    return false
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    return false
  }

  const { pathname } = request.nextUrl
  return PUBLIC_EDGE_ROUTES.some(route => route.test(pathname))
}

const applyVaryHeader = (response: NextResponse, values: string[]) => {
  const existing = response.headers.get('Vary')
  const merged = new Set<string>()

  if (existing) {
    for (const entry of existing.split(',')) {
      const trimmed = entry.trim()
      if (trimmed.length > 0) {
        merged.add(trimmed)
      }
    }
  }

  for (const value of values) {
    if (value && value.length > 0) {
      merged.add(value)
    }
  }

  if (merged.size > 0) {
    response.headers.set('Vary', Array.from(merged).join(', '))
  }
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

  const { data } = await supabase.auth.getUser()
  const user = (data?.user as User | null | undefined) ?? null

  const isAuthenticated = Boolean(user)
  const isPublicEdgeCache = shouldApplyPublicEdgeCache(request, isAuthenticated)
  const tenantId = resolveTenantId(user)
  const tenantCacheKey = tenantId
    ? `tenant:${tenantId}`
    : `tenant:${isPublicEdgeCache ? 'public' : 'unknown'}`

  const cacheControl = isPublicEdgeCache
    ? PUBLIC_CACHE_CONTROL
    : PRIVATE_CACHE_CONTROL

  response.headers.set('Cache-Control', cacheControl)
  response.headers.set('CDN-Cache-Control', cacheControl)
  if (!isPublicEdgeCache) {
    response.headers.set('Pragma', 'no-cache')
  }

  response.headers.set(
    'x-cache-strategy',
    isPublicEdgeCache ? 'public-edge' : 'private-no-store'
  )
  response.headers.set('x-tenant-cache-tags', tenantCacheKey)

  applyVaryHeader(response, DEFAULT_VARY_HEADERS)

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