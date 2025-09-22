// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { createSupabaseClientLoggingConfig } from '@/utils/supabase/logging'
import { TRACE_HEADER_NAME } from '@/utils/trace/constants'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const traceId = requestHeaders.get(TRACE_HEADER_NAME) ?? crypto.randomUUID()
  requestHeaders.set(TRACE_HEADER_NAME, traceId)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set(TRACE_HEADER_NAME, traceId)

  const loggingConfig = createSupabaseClientLoggingConfig({
    traceId,
    source: 'middleware',
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
              headers: requestHeaders,
            },
          })
          response.headers.set(TRACE_HEADER_NAME, traceId)
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
              headers: requestHeaders,
            },
          })
          response.headers.set(TRACE_HEADER_NAME, traceId)
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
      ...loggingConfig,
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