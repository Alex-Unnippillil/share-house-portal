import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ResultCode,
  buildCollectionCacheMetadata,
  clearFetcherCache,
  fetcher,
  formatDate,
  formatNumber,
  getCollectionCacheSignature,
  getMessageFromCode,
  getStringFromBuffer,
  runAsyncFnWithoutBlocking,
  sleep,
} from '@/lib/utils'

describe('collection cache helpers', () => {
  it('computes signature counts and latest timestamp with fallbacks', () => {
    const rows = [
      { updated_at: '2024-01-02T03:04:05Z' },
      { updated_at: new Date('2023-12-12T11:10:09Z') },
      { updated_at: null },
    ]

    const signature = getCollectionCacheSignature(rows, { count: 10 })
    expect(signature.count).toBe(10)
    expect(signature.latestUpdatedAtMs).toBe(new Date('2024-01-02T03:04:05Z').getTime())

    const emptySignature = getCollectionCacheSignature(undefined, {
      fallbackUpdatedAt: '2024-02-20T00:00:00Z',
    })
    expect(emptySignature.count).toBe(0)
    expect(emptySignature.latestUpdatedAtMs).toBe(new Date('2024-02-20T00:00:00Z').getTime())

    const metadata = buildCollectionCacheMetadata(undefined, {
      fallbackUpdatedAt: '2024-02-20T00:00:00Z',
    })

    expect(metadata.count).toBe(0)
    expect(metadata.latestUpdatedAt).toBe('2024-02-20T00:00:00.000Z')
    expect(metadata.etag).toMatch(/^W\/"[A-Za-z0-9_-]+"$/)
  })
})

describe('fetcher', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearFetcherCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
    clearFetcherCache()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('adds caching headers and reuses cached payloads when receiving a 304', async () => {
    const payload = { hello: 'world' }
    const etag = 'W/"abc"'

    const firstResponse = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ETag: etag,
        'Content-Type': 'application/json',
      },
    })

    const secondResponse = new Response(null, {
      status: 304,
      headers: { ETag: etag },
    })

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse)

    const first = await fetcher<typeof payload>('https://example.com/api')
    expect(first).toEqual(payload)

    const second = await fetcher<typeof payload>('https://example.com/api')
    expect(second).toEqual(payload)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const secondInit = fetchSpy.mock.calls[1][1]
    expect(new Headers(secondInit?.headers).get('If-None-Match')).toBe(etag)
    expect(new Headers(secondInit?.headers).get('Accept')).toBe('application/json')
  })

  it('throws when server responds with a JSON error payload', async () => {
    const errorResponse = new Response(JSON.stringify({ error: 'nope' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })

    vi.spyOn(global, 'fetch').mockResolvedValue(errorResponse)

    await expect(fetcher('https://example.com/api')).rejects.toMatchObject({
      message: 'nope',
      status: 400,
    })
  })

  it('throws a generic error when the payload is not JSON', async () => {
    const errorResponse = new Response('fail', { status: 500 })
    vi.spyOn(global, 'fetch').mockResolvedValue(errorResponse)

    await expect(fetcher('https://example.com/api')).rejects.toMatchObject({
      message: 'An unexpected error occurred',
      status: 500,
    })
  })
})

describe('formatting helpers', () => {
  it('formats dates and numbers consistently', () => {
    expect(formatDate('2024-06-01')).toBe('June 1, 2024')
    expect(formatNumber(1234.56)).toBe('$1,234.56')
  })

  it('converts binary data to a hex string', () => {
    const buffer = Uint8Array.from([0, 15, 255]).buffer
    expect(getStringFromBuffer(buffer)).toBe('000fff')
  })
})

describe('async helpers', () => {
  it('runs async functions without blocking and supports sleeping', async () => {
    const asyncFn = vi.fn().mockResolvedValue(undefined)
    runAsyncFnWithoutBlocking(asyncFn)
    expect(asyncFn).toHaveBeenCalled()

    vi.useFakeTimers()
    const sleepPromise = sleep(50)
    vi.advanceTimersByTime(50)
    await expect(sleepPromise).resolves.toBeUndefined()
  })
})

describe('result messaging', () => {
  it('maps result codes to user friendly messages', () => {
    expect(getMessageFromCode(ResultCode.InvalidCredentials)).toMatch(/Invalid credentials/)
    expect(getMessageFromCode(ResultCode.UserCreated)).toMatch(/User created/)
    expect(getMessageFromCode('UNKNOWN')).toBeUndefined()
  })
})
