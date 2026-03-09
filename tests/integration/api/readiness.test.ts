import { describe, expect, it, vi } from 'vitest'

const getReadinessSummary = vi.fn()

vi.mock('@/lib/operations/dependency-health', () => ({
  getReadinessSummary,
}))

describe('GET /api/readiness', () => {
  it('returns 200 for healthy readiness', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'healthy',
      core: [{ name: 'app', status: 'healthy', message: 'application process is running' }],
      optional: [],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET(new Request('https://example.com/api/readiness'))

    expect(response.status).toBe(200)
    expect(getReadinessSummary).toHaveBeenCalledWith({ includeOptional: false })
    await expect(response.json()).resolves.toMatchObject({ status: 'healthy' })
  })

  it('returns 206 for degraded readiness based on core dependencies', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'degraded',
      core: [
        { name: 'supabase', status: 'degraded', message: 'authentication failed; response status=401' },
      ],
      optional: [],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET(new Request('https://example.com/api/readiness'))

    expect(response.status).toBe(206)
    await expect(response.json()).resolves.toMatchObject({ status: 'degraded' })
  })

  it('returns 503 for down readiness', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'down',
      core: [{ name: 'supabase', status: 'down', message: 'probe failed; network error' }],
      optional: [],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET(new Request('https://example.com/api/readiness'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ status: 'down' })
  })

  it('includes optional probes only when full=1', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'healthy',
      core: [{ name: 'app', status: 'healthy', message: 'application process is running' }],
      optional: [{ name: 'stripe', status: 'healthy', message: 'probe succeeded; response status=200' }],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET(new Request('https://example.com/api/readiness?full=1'))

    expect(response.status).toBe(200)
    expect(getReadinessSummary).toHaveBeenCalledWith({ includeOptional: true })
    await expect(response.json()).resolves.toMatchObject({
      includeOptional: true,
      optional: [{ name: 'stripe', status: 'healthy' }],
    })
  })
})
