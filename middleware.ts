// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient } from '@/lib/supabase-client'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient({
    get(name) {
      return request.cookies.get(name)
    },
    set({ name, value, ...options }) {
      request.cookies.set({ name, value, ...options })
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
      response.cookies.set({ name, value, ...options })
    },
    delete(name, options) {
      request.cookies.set({ name, value: '', ...(options ?? {}) })
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
      response.cookies.set({ name, value: '', ...(options ?? {}) })
    },
  })

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