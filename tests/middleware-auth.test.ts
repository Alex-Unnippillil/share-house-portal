import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { middleware } from '@/middleware'

const updateSessionMock = vi.fn()

vi.mock('@/utils/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => updateSessionMock(...args),
}))

describe('middleware auth protection', () => {
  beforeEach(() => {
    updateSessionMock.mockReset()
  })

  it('redirects unauthenticated chores requests to /auth', async () => {
    updateSessionMock.mockResolvedValue({
      supabase: {},
      response: NextResponse.next(),
      user: null,
    })

    const request = new NextRequest('http://localhost/chores')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/auth?redirectTo=%2Fchores')
  })

  it('redirects unauthenticated supplies requests to /auth', async () => {
    updateSessionMock.mockResolvedValue({
      supabase: {},
      response: NextResponse.next(),
      user: null,
    })

    const request = new NextRequest('http://localhost/supplies')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/auth?redirectTo=%2Fsupplies')
  })

  it('allows authenticated requests to continue', async () => {
    updateSessionMock.mockResolvedValue({
      supabase: {},
      response: NextResponse.next(),
      user: {
        app_metadata: { role: 'tenant' },
        user_metadata: {},
      },
    })

    const request = new NextRequest('http://localhost/chores')
    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
