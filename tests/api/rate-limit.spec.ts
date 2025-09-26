import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TokenBucketRateLimiter } from '@/lib/rate-limit'

describe('TokenBucketRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enforces limits per key and restores capacity after the interval', () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillIntervalMs: 1_000,
    })
    const key = '127.0.0.1:/api/example'

    expect(limiter.consume(key).success).toBe(true)
    expect(limiter.consume(key).success).toBe(true)

    const blocked = limiter.consume(key)
    expect(blocked.success).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)

    vi.advanceTimersByTime(1_000)

    expect(limiter.consume(key).success).toBe(true)
  })

  it('maintains isolated buckets for each key', () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillIntervalMs: 5_000,
    })

    const firstKey = '127.0.0.1:/api/alpha'
    const secondKey = '127.0.0.1:/api/beta'

    expect(limiter.consume(firstKey).success).toBe(true)
    expect(limiter.consume(firstKey).success).toBe(false)

    expect(limiter.consume(secondKey).success).toBe(true)
  })
})
