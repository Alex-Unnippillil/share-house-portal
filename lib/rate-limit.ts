import { NextResponse } from "next/server"

interface RateLimitStore {
  increment(
    key: string,
    limit: number,
    windowInSeconds: number
  ): Promise<RateLimitCheckResult>
}

interface RateLimitCheckResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  totalHits: number
}

interface EnforceRateLimitOptions {
  limit: number
  window: number
  identifier?: string
  prefix?: string
  metadata?: Record<string, unknown>
}

interface EnforceRateLimitResult extends RateLimitCheckResult {
  key: string
  identifier: string
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, { count: number; expiresAt: number }>()

  async increment(
    key: string,
    limit: number,
    windowInSeconds: number
  ): Promise<RateLimitCheckResult> {
    const now = Date.now()
    const existing = this.counters.get(key)

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowInSeconds * 1000
      this.counters.set(key, { count: 1, expiresAt })
      return {
        success: true,
        limit,
        remaining: Math.max(0, limit - 1),
        reset: windowInSeconds,
        totalHits: 1
      }
    }

    existing.count += 1
    const remaining = Math.max(0, limit - existing.count)
    const reset = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000))

    return {
      success: existing.count <= limit,
      limit,
      remaining,
      reset,
      totalHits: existing.count
    }
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  constructor(private readonly url: string, private readonly token: string) {}

  async increment(
    key: string,
    limit: number,
    windowInSeconds: number
  ): Promise<RateLimitCheckResult> {
    const response = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowInSeconds, "NX"],
        ["TTL", key]
      ])
    })

    if (!response.ok) {
      throw new Error(`Upstash rate limit request failed with status ${response.status}`)
    }

    const results = (await response.json()) as Array<{ result: number }>
    const totalHits = typeof results?.[0]?.result === "number" ? results[0].result : 1
    const ttl = typeof results?.[2]?.result === "number" ? results[2].result : windowInSeconds
    const normalizedTtl = ttl > 0 ? ttl : windowInSeconds
    const remaining = Math.max(0, limit - totalHits)

    return {
      success: totalHits <= limit,
      limit,
      remaining,
      reset: normalizedTtl,
      totalHits
    }
  }
}

const memoryStore = createGlobalMemoryStore()
let upstashStore: UpstashRateLimitStore | null = null

export async function enforceRateLimit(
  request: Request,
  options: EnforceRateLimitOptions
): Promise<EnforceRateLimitResult> {
  const identifier = options.identifier ?? getRequestIdentifier(request)
  const prefix = options.prefix ?? "rate-limit"
  const key = `${prefix}:${identifier}`
  const store = getStore()

  let result: RateLimitCheckResult

  try {
    result = await store.increment(key, options.limit, options.window)
  } catch (error) {
    console.error("Falling back to in-memory rate limiting store", error)
    result = await memoryStore.increment(key, options.limit, options.window)
  }

  if (!result.success) {
    logRateLimitExceeded(request, {
      key,
      identifier,
      metadata: options.metadata,
      result
    })
  }

  return {
    ...result,
    key,
    identifier
  }
}

export function getRequestIdentifier(request: Request): string {
  const headers = request.headers
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    const [first] = forwardedFor.split(",")
    if (first) {
      return first.trim()
    }
  }

  const headerKeys = [
    "x-real-ip",
    "x-client-ip",
    "x-cluster-client-ip",
    "x-forwarded",
    "forwarded",
    "cf-connecting-ip",
    "fastly-client-ip",
    "true-client-ip",
    "x-vercel-forwarded-for"
  ]

  for (const key of headerKeys) {
    const value = headers.get(key)
    if (value) {
      return value
    }
  }

  return "anonymous"
}

function logRateLimitExceeded(
  request: Request,
  context: {
    key: string
    identifier: string
    metadata?: Record<string, unknown>
    result: RateLimitCheckResult
  }
) {
  try {
    const url = new URL(request.url)
    const userAgent = request.headers.get("user-agent") ?? "unknown"
    const requestId =
      request.headers.get("x-request-id") ??
      request.headers.get("x-vercel-id") ??
      request.headers.get("traceparent") ??
      "unknown"

    console.warn("Rate limit exceeded", {
      event: "rate_limit_exceeded",
      method: request.method,
      path: url.pathname,
      identifier: context.identifier,
      key: context.key,
      limit: context.result.limit,
      totalHits: context.result.totalHits,
      resetInSeconds: context.result.reset,
      forwardedFor: request.headers.get("x-forwarded-for") ?? "",
      userAgent,
      requestId,
      metadata: context.metadata ?? {}
    })
  } catch (error) {
    console.error("Failed to log rate limit exceedance", error)
  }
}

function getStore(): RateLimitStore {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    if (!upstashStore) {
      upstashStore = new UpstashRateLimitStore(redisUrl, redisToken)
    }
    return upstashStore
  }

  return memoryStore
}

function createGlobalMemoryStore(): InMemoryRateLimitStore {
  const globalContext = globalThis as unknown as {
    __rateLimitMemoryStore?: InMemoryRateLimitStore
  }

  if (!globalContext.__rateLimitMemoryStore) {
    globalContext.__rateLimitMemoryStore = new InMemoryRateLimitStore()
  }

  return globalContext.__rateLimitMemoryStore
}

export function rateLimitResponse(result: RateLimitCheckResult) {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      limit: result.limit,
      retryAfter: result.reset
    },
    {
      status: 429,
      headers: {
        "Retry-After": result.reset.toString()
      }
    }
  )
}
