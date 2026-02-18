import { describe, expect, it, vi } from 'vitest'

import { isLikelyTransientError, providerOutageMessage, retryWithBackoff } from '@/lib/resilience'

describe('resilience utilities', () => {
  it('retries transient failures and succeeds', async () => {
    let callCount = 0

    const result = await retryWithBackoff(
      async () => {
        callCount += 1
        if (callCount < 3) {
          throw new Error('503 service unavailable')
        }

        return 'ok'
      },
      {
        retries: 3,
        initialDelayMs: 1,
      }
    )

    expect(result.value).toBe('ok')
    expect(result.attempts).toBe(3)
  })

  it('does not retry non-transient failures by default', async () => {
    const operation = vi.fn(async () => {
      throw new Error('validation failed')
    })

    await expect(
      retryWithBackoff(operation, {
        retries: 2,
        initialDelayMs: 1,
      })
    ).rejects.toThrow('validation failed')

    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('provides provider-safe outage messages', () => {
    expect(providerOutageMessage('stripe')).toContain('temporarily unavailable')
    expect(providerOutageMessage('calcom')).toContain('temporarily degraded')
    expect(providerOutageMessage('documenso')).toContain('temporarily unavailable')
  })

  it('detects transient error messages', () => {
    expect(isLikelyTransientError(new Error('504 timeout'))).toBe(true)
    expect(isLikelyTransientError(new Error('invalid payload'))).toBe(false)
  })
})
