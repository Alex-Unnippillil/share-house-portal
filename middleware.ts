// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { CORRELATION_ID_HEADER } from '@/lib/constants/logging'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const incomingCorrelationId =
    requestHeaders.get(CORRELATION_ID_HEADER) ?? crypto.randomUUID()
  requestHeaders.set(CORRELATION_ID_HEADER, incomingCorrelationId)

  const applyCorrelationHeader = (res: NextResponse) => {
    res.headers.set(CORRELATION_ID_HEADER, incomingCorrelationId)
    return res
  }

  let response = applyCorrelationHeader(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  )

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
          response = applyCorrelationHeader(
            NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
          )
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
          response = applyCorrelationHeader(
            NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
          )
          response.cookies.set({
            name,
            value: '',
            ...options,
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