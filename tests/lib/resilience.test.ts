import { describe, expect, it, vi } from 'vitest'

import { IntegrationTimeoutError, IntegrationUnavailableError } from '@/lib/errors'
import { ResilienceManager } from '@/lib/resilience'

describe('ResilienceManager', () => {
  it('enqueues operations and returns fallback when the circuit is open', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    const manager = new ResilienceManager({
      serviceName: 'test-service',
      timeoutMs: 50,
      breakerThreshold: 1,
      halfOpenAfterMs: 1000,
      retryAttempts: 1,
      retryBackoffMs: 1,
      queueLimit: 5,
      maxQueueAttempts: 1,
      logger,
    })

    await expect(
      manager.execute('failing-op', () => {
        throw new Error('boom')
      })
    ).rejects.toBeInstanceOf(IntegrationUnavailableError)

    const fallback = vi.fn(() => ({ ok: false }))
    const result = await manager.execute('retriable-op', () => Promise.resolve('ok'), {
      fallback,
    })

    expect(result).toEqual({ ok: false })
    expect(fallback).toHaveBeenCalled()
    const context = fallback.mock.calls[0]?.[0]
    expect(context?.queued).toBe(true)
    expect(typeof context?.jobId).toBe('string')
    expect(manager.queueSize).toBeGreaterThan(0)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('throws IntegrationTimeoutError when an operation exceeds the timeout', async () => {
    const manager = new ResilienceManager({
      serviceName: 'timeout-service',
      timeoutMs: 20,
      breakerThreshold: 3,
      halfOpenAfterMs: 100,
      retryAttempts: 1,
      retryBackoffMs: 1,
      queueLimit: 5,
      maxQueueAttempts: 1,
    })

    await expect(
      manager.execute('slow-op', () => new Promise(resolve => setTimeout(resolve, 100)))
    ).rejects.toBeInstanceOf(IntegrationTimeoutError)
  })

  it('throws IntegrationUnavailableError when breaker is open without fallback', async () => {
    const manager = new ResilienceManager({
      serviceName: 'breaker-service',
      timeoutMs: 50,
      breakerThreshold: 1,
      halfOpenAfterMs: 1000,
      retryAttempts: 1,
      retryBackoffMs: 1,
      queueLimit: 2,
      maxQueueAttempts: 1,
    })

    await expect(
      manager.execute('initial-failure', () => {
        throw new Error('fail')
      })
    ).rejects.toThrow('fail')

    await expect(manager.execute('next-op', () => 'ok')).rejects.toBeInstanceOf(
      IntegrationUnavailableError
    )
  })
})
