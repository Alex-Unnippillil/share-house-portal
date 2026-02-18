import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/operations/dependency-health', () => ({
  getReadinessSummary: vi.fn(async () => ({
    status: 'degraded',
    dependencies: [
      { name: 'stripe', status: 'degraded', message: 'Missing environment variables: STRIPE_SECRET_KEY' },
    ],
  })),
}))

describe('GET /api/readiness', () => {
  it('returns 503 for degraded readiness', async () => {
    const { GET } = await import('@/app/api/readiness/route')

    const response = await GET()
    expect(response.status).toBe(503)

    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
    })
  })
})
