// content security policy requirements vary from app to app head to https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy to learn how to configure nonces within middleware and or how to set policies within your next.config file

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const staticAssetExtension =
  /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|mjs|png|svg|txt|webp|woff2|woff|xml|wasm)$/

function resolveStaticEncoding(header: string | null) {
  if (!header) {
    return 'br'
  }

  const lowered = header.toLowerCase()

  if (lowered.includes('br')) {
    return 'br'
  }

  if (lowered.includes('gzip')) {
    return 'gzip'
  }

  return null
}

function appendVaryHeader(current: string | null, value: string) {
  if (!current) {
    return value
  }

  const segments = new Set(
    current
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
  segments.add(value)
  return Array.from(segments).join(', ')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next/static/') ||
    staticAssetExtension.test(pathname)
  ) {
    const requestHeaders = new Headers(request.headers)
    const acceptEncoding = requestHeaders.get('accept-encoding')

    if (!acceptEncoding || !acceptEncoding.toLowerCase().includes('br')) {
      requestHeaders.set('accept-encoding', 'br, gzip;q=0.5')
    }

    const encoding = resolveStaticEncoding(requestHeaders.get('accept-encoding'))
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    if (encoding) {
      response.headers.set('Content-Encoding', encoding)
      response.headers.set(
        'Vary',
        appendVaryHeader(response.headers.get('Vary'), 'Accept-Encoding')
      )
    }

    return response
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

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/(.*\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|mjs|png|svg|txt|webp|woff2|woff|xml|wasm))',
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}