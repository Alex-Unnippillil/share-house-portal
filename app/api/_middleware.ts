import { NextResponse, type NextRequest } from 'next/server'

import { recordPerformanceSample } from '@/lib/supabase'

const SKIP_HEADER = 'x-share-house-skip-api-middleware'

function shouldIncludeBody(method: string) {
  const upper = method.toUpperCase()
  return upper !== 'GET' && upper !== 'HEAD'
}

export async function middleware(request: NextRequest) {
  if (request.headers.get(SKIP_HEADER) === '1') {
    return NextResponse.next()
  }

  const start =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()

  const headers = new Headers(request.headers)
  headers.set(SKIP_HEADER, '1')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  }

  if (shouldIncludeBody(request.method) && request.body) {
    init.body = request.body
  }

  const targetRequest = new Request(request.nextUrl, init)

  let response: Response | undefined
  let error: unknown

  try {
    response = await fetch(targetRequest)
    return response
  } catch (err) {
    error = err
    throw err
  } finally {
    const end =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()

    const durationMs = end - start

    const metadata: Record<string, unknown> = {
      method: request.method.toUpperCase(),
      route: request.nextUrl.pathname,
      status: response?.status ?? null,
      requestId: request.headers.get('x-request-id') ?? undefined,
    }

    if (error instanceof Error) {
      metadata.error = error.message
    } else if (error) {
      metadata.error = String(error)
    }

    recordPerformanceSample({
      key: `api:${request.nextUrl.pathname}:${request.method.toUpperCase()}`,
      durationMs,
      source: 'api-middleware',
      environment: 'edge',
      helper: 'app/api/_middleware',
      statusCode: response?.status,
      metadata,
    })
  }
}

export const config = {
  matcher: ['/api/:path*'],
}
