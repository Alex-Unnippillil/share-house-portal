import 'server-only'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  bucket: string
  key: string
  limit: number
  windowMs: number
  now?: number
}

type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now()
  const storeKey = `${options.bucket}:${options.key}`
  const existing = rateLimitStore.get(storeKey)

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(storeKey, {
      count: 1,
      resetAt: now + options.windowMs,
    })

    return {
      ok: true,
      remaining: Math.max(options.limit - 1, 0),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    }
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    }
  }

  existing.count += 1
  rateLimitStore.set(storeKey, existing)

  return {
    ok: true,
    remaining: Math.max(options.limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
  }
}

export function getRateLimitKeyFromRequest(req: Request, fallback: string): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp?.trim()
  return ip ? `ip:${ip}` : fallback
}

export function createRateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests for this endpoint. Please retry later.',
      },
    },
    {
      status: 429,
      headers: {
        'retry-after': String(result.retryAfterSeconds),
      },
    }
  )
}

export function resetRateLimitStore() {
  rateLimitStore.clear()
}
