import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createServerClientMock = vi.hoisted(() => vi.fn())

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

import { middleware, PORTAL_CLAIM_NAMESPACE } from '@/middleware'
import type { Session } from '@supabase/supabase-js'

type ClaimShape = {
  household_id: string
  roles: string[]
}

const JWT_HEADER = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' })
).toString('base64url')

function encodeToken(claim: ClaimShape): string {
  const payload = {
    sub: 'user-123',
    [PORTAL_CLAIM_NAMESPACE]: claim,
  }

  const payloadSegment = Buffer.from(JSON.stringify(payload)).toString(
    'base64url'
  )

  return `${JWT_HEADER}.${payloadSegment}.signature`
}

function createSession(claim: ClaimShape | null): Session | null {
  if (!claim) return null

  return {
    access_token: encodeToken(claim),
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      app_metadata: {
        provider: 'email',
        [PORTAL_CLAIM_NAMESPACE]: claim,
      },
      user_metadata: {},
    },
  } as unknown as Session
}

function mockSupabaseSession(session: Session | null) {
  createServerClientMock.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
  })
}

function buildRequest(path: string, invokePath?: string) {
  const headers = new Headers()
  if (invokePath) {
    headers.set('x-invoke-path', invokePath)
  }

  return new NextRequest(new URL(`http://localhost${path}`), {
    headers,
  })
}

beforeEach(() => {
  createServerClientMock.mockReset()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('middleware role enforcement', () => {
  it('redirects unauthenticated tenant requests to auth', async () => {
    mockSupabaseSession(null)

    const request = buildRequest('/dashboard', '/(tenant)/dashboard')
    const response = await middleware(request)

    expect(response.headers.get('location')).toBe('http://localhost/auth')
  })

  it('blocks users missing the tenant role', async () => {
    mockSupabaseSession(
      createSession({ household_id: 'house-1', roles: ['roommate'] })
    )

    const request = buildRequest('/dashboard', '/(tenant)/dashboard')
    const response = await middleware(request)

    expect(response.headers.get('location')).toBe('http://localhost/account')
  })

  it('denies access to admin areas without admin role', async () => {
    mockSupabaseSession(
      createSession({ household_id: 'house-1', roles: ['tenant'] })
    )

    const request = buildRequest('/settings', '/(admin)/settings')
    const response = await middleware(request)

    expect(response.status).toBe(403)
  })

  it('allows admin claims to pass through', async () => {
    const claim = { household_id: 'house-42', roles: ['tenant', 'admin'] }
    mockSupabaseSession(createSession(claim))

    const request = buildRequest('/settings', '/(admin)/settings')
    const response = await middleware(request)

    expect(response.headers.get('x-onyx-household-id')).toBe(claim.household_id)
    expect(response.headers.get('x-onyx-roles')).toBe('tenant,admin')
    expect(response.headers.get('location')).toBeNull()
  })
})
