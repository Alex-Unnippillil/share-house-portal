import { describe, expect, it, vi } from 'vitest'

const getReadinessSummary = vi.fn()

vi.mock('@/lib/operations/dependency-health', () => ({
  getReadinessSummary,
}))

describe('GET /api/readiness', () => {
  it('returns 200 for healthy readiness', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'healthy',
      dependencies: [{ name: 'stripe', status: 'healthy', message: 'probe succeeded; response status=200' }],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ status: 'healthy' })
  })

  it('returns 206 for degraded readiness', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'degraded',
      dependencies: [
        { name: 'stripe', status: 'degraded', message: 'authentication failed; response status=401' },
      ],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET()

    expect(response.status).toBe(206)
    await expect(response.json()).resolves.toMatchObject({ status: 'degraded' })
  })

  it('returns 503 for down readiness', async () => {
    getReadinessSummary.mockResolvedValueOnce({
      status: 'down',
      dependencies: [{ name: 'supabase', status: 'down', message: 'probe failed; network error' }],
    })

    const { GET } = await import('@/app/api/readiness/route')
    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ status: 'down' })
  })
})
