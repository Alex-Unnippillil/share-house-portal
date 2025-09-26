export interface TokenBucketOptions {
  /**
   * Maximum number of tokens that can accumulate within the bucket.
   */
  capacity: number
  /**
   * Interval in milliseconds in which the bucket fully refills.
   */
  refillIntervalMs: number
}

interface BucketState {
  tokens: number
  lastRefill: number
}

export type RateLimitResult =
  | { success: true }
  | { success: false; retryAfter: number }

export class TokenBucketRateLimiter {
  private readonly capacity: number
  private readonly refillIntervalMs: number
  private readonly refillRatePerMs: number
  private readonly buckets = new Map<string, BucketState>()

  constructor(options: TokenBucketOptions) {
    if (options.capacity <= 0) {
      throw new Error('Token bucket capacity must be greater than 0')
    }

    if (options.refillIntervalMs <= 0) {
      throw new Error('Token bucket refill interval must be greater than 0')
    }

    this.capacity = options.capacity
    this.refillIntervalMs = options.refillIntervalMs
    this.refillRatePerMs = this.capacity / this.refillIntervalMs
  }

  consume(key: string, now = Date.now()): RateLimitResult {
    const bucket = this.getBucket(key, now)
    this.refill(bucket, now)

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      bucket.lastRefill = now
      return { success: true }
    }

    const msUntilNextToken = Math.ceil((1 - bucket.tokens) / this.refillRatePerMs)
    const retryAfterSeconds = Math.max(1, Math.ceil(msUntilNextToken / 1000))

    return {
      success: false,
      retryAfter: retryAfterSeconds,
    }
  }

  reset(): void {
    this.buckets.clear()
  }

  private getBucket(key: string, now: number): BucketState {
    let bucket = this.buckets.get(key)

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
      }
      this.buckets.set(key, bucket)
    }

    return bucket
  }

  private refill(bucket: BucketState, now: number): void {
    if (now <= bucket.lastRefill) {
      return
    }

    const elapsedMs = now - bucket.lastRefill
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + elapsedMs * this.refillRatePerMs
    )
    bucket.lastRefill = now
  }
}

const globalForRateLimiter = globalThis as unknown as {
  __apiRateLimiter?: TokenBucketRateLimiter
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}

const defaultCapacity = parsePositiveInteger(
  process.env.NEXT_API_RATE_LIMIT_CAPACITY,
  60
)
const defaultRefillIntervalMs = parsePositiveInteger(
  process.env.NEXT_API_RATE_LIMIT_REFILL_INTERVAL_MS,
  60_000
)

export const apiRateLimiter =
  globalForRateLimiter.__apiRateLimiter ??
  new TokenBucketRateLimiter({
    capacity: defaultCapacity,
    refillIntervalMs: defaultRefillIntervalMs,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimiter.__apiRateLimiter = apiRateLimiter
}
