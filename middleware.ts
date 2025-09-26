import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_DOMAINS = ['supabase.co', 'supabase.in', 'supabase.net']

const STATIC_SECURITY_HEADERS: Array<[string, string]> = [
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-DNS-Prefetch-Control', 'on'],
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
  ['X-XSS-Protection', '1; mode=block'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
]

function generateNonce() {
  const array = crypto.getRandomValues(new Uint8Array(16))
  let nonce = ''

  array.forEach((value) => {
    nonce += String.fromCharCode(value)
  })

  return btoa(nonce)
}

function normaliseOrigin(url: string | undefined | null) {
  if (!url) return undefined
  try {
    return new URL(url).origin
  } catch (error) {
    console.warn('[csp] unable to parse origin for', url, error)
    return undefined
  }
}

function toWebsocketOrigin(origin: string) {
  if (origin.startsWith('https://')) {
    return origin.replace('https://', 'wss://')
  }

  if (origin.startsWith('http://')) {
    return origin.replace('http://', 'ws://')
  }

  return origin
}

function createContentSecurityPolicy(nonce: string) {
  const supabaseSources = SUPABASE_DOMAINS.flatMap((domain) => [
    `https://*.${domain}`,
    `wss://*.${domain}`,
  ])

  const supabaseUrl = normaliseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (supabaseUrl) {
    supabaseSources.push(supabaseUrl)
    supabaseSources.push(toWebsocketOrigin(supabaseUrl))
  }

  const calComOrigin =
    normaliseOrigin(process.env.CALCOM_BASE_URL) || 'https://api.cal.com'
  const documensoOrigin =
    normaliseOrigin(process.env.DOCUMENSO_BASE_URL) ||
    'https://app.documenso.com'

  const connectSrc = new Set([
    "'self'",
    ...supabaseSources,
    'https://api.stripe.com',
    'https://checkout.stripe.com',
    'https://billing.stripe.com',
    'https://hooks.stripe.com',
    'https://js.stripe.com',
    'https://m.stripe.network',
    'https://q.stripe.com',
    'https://r.stripe.com',
    'https://va.vercel-scripts.com',
    'https://vitals.vercel-insights.com',
    calComOrigin,
    'https://cal.com',
    'https://*.cal.com',
    documensoOrigin,
    'https://*.documenso.com',
  ])

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://js.stripe.com',
    'https://m.stripe.network',
    'https://va.vercel-scripts.com',
    'https://app.termly.io',
  ]

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
  ]

  const fontSrc = ["'self'", 'https://fonts.gstatic.com']

  const mediaSrc = [
    "'self'",
    'blob:',
    'data:',
    'https://quantumone.b-cdn.net',
    'https://*.supabase.co',
    'https://*.supabase.in',
    'https://*.supabase.net',
    'https://youtube.com',
    'https://www.youtube.com',
    'https://*.youtube.com',
  ]

  const frameSrc = [
    "'self'",
    'https://*.supabase.co',
    'https://*.supabase.in',
    'https://*.supabase.net',
    'https://js.stripe.com',
    'https://checkout.stripe.com',
    'https://billing.stripe.com',
    'https://youtube.com',
    'https://www.youtube.com',
    'https://*.youtube.com',
    'https://quantumone.b-cdn.net',
  ]

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    "img-src * blob: data:",
    `media-src ${mediaSrc.join(' ')}`,
    `connect-src ${Array.from(connectSrc).join(' ')}`,
    `font-src ${fontSrc.join(' ')}`,
    `frame-src ${frameSrc.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://hooks.stripe.com`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ]

  return directives.join('; ')
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const createResponse = () =>
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

  let response = createResponse()

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
          response = createResponse()
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
          response = createResponse()
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

  const csp = createContentSecurityPolicy(nonce)
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)
  STATIC_SECURITY_HEADERS.forEach(([key, value]) => {
    response.headers.set(key, value)
  })

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