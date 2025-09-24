import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'user-1',
              email: 'user@example.com',
              app_metadata: { tenant_id: 'tenant-123' },
            },
          },
          error: null,
        })),
      },
    })),
  }
})

vi.mock('@/lib/rate-limit/service', () => {
  return {
    fetchTenantPlan: vi.fn(),
    recordTenantFeatureUsage: vi.fn(),
  }
})

import { middleware } from '@/middleware'
import {
  fetchTenantPlan,
  recordTenantFeatureUsage,
} from '@/lib/rate-limit/service'

const mockedFetchTenantPlan = vi.mocked(fetchTenantPlan)
const mockedRecordUsage = vi.mocked(recordTenantFeatureUsage)

describe('plan-based middleware rate limiting', () => {
  beforeEach(() => {
    mockedFetchTenantPlan.mockResolvedValue({
      tenant_id: 'tenant-123',
      plan_code: 'starter',
      overrides: null,
    })

    mockedRecordUsage.mockResolvedValue({
      tenantId: 'tenant-123',
      feature: 'documents',
      usage: 12,
      windowStart: new Date(Date.now() - 10_000).toISOString(),
      windowEnd: new Date(Date.now() + 60_000).toISOString(),
      limit: 120,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const buildRequest = (url: string, headers: HeadersInit = {}) =>
    new NextRequest(url, {
      headers: new Headers(headers),
    })

  it('attaches RateLimit headers when usage is within plan allowance', async () => {
    const request = buildRequest('http://localhost/api/documents', {
      'x-tenant-id': 'tenant-123',
    })

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(mockedFetchTenantPlan).toHaveBeenCalledWith('tenant-123')
    expect(mockedRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-123',
        feature: 'documents',
        limit: 120,
      })
    )

    expect(response.headers.get('ratelimit-limit')).toBe('120')
    expect(response.headers.get('ratelimit-remaining')).toBe(String(120 - 12))
    expect(response.headers.get('ratelimit-policy')).toContain('documents:starter')
  })

  it('returns 429 with upgrade hints when the tenant exceeds its quota', async () => {
    mockedRecordUsage.mockResolvedValue({
      tenantId: 'tenant-123',
      feature: 'documents',
      usage: 130,
      windowStart: new Date(Date.now() - 5_000).toISOString(),
      windowEnd: new Date(Date.now() + 300_000).toISOString(),
      limit: 120,
    })

    const request = buildRequest('http://localhost/api/documents', {
      'x-tenant-id': 'tenant-123',
    })

    const response = await middleware(request)

    expect(response.status).toBe(429)
    expect(response.headers.get('ratelimit-remaining')).toBe('0')
    expect(response.headers.get('retry-after')).toBeTruthy()
    expect(response.headers.get('link')).toContain('upgrade')

    const payload = await response.json()
    expect(payload.error).toBe('rate_limit_exceeded')
    expect(payload.plan.code).toBe('starter')
    expect(payload.feature).toBe('documents')
  })

  it('skips rate limit evaluation for non-API routes', async () => {
    const request = buildRequest('http://localhost/dashboard')

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('ratelimit-limit')).toBeNull()
    expect(mockedRecordUsage).not.toHaveBeenCalled()
  })
})
