import { describe, expect, it } from 'vitest'

import { type CookieOptions } from '@supabase/ssr'

import {
  computeCookieSecurityContext,
  withSupabaseCookieDefaults,
} from '@/utils/supabase/cookie-helpers'

describe('supabase cookie security helpers', () => {
  it('applies secure defaults for production hosts', () => {
    const context = computeCookieSecurityContext({
      host: 'app.roomsily.com:443',
      protocol: 'https',
    })

    const normalized = withSupabaseCookieDefaults({}, context)

    expect(normalized.httpOnly).toBe(true)
    expect(normalized.secure).toBe(true)
    expect(normalized.sameSite).toBe('lax')
    expect(normalized.domain).toBe('app.roomsily.com')
  })

  it('retains strict SameSite directives when supplied', () => {
    const context = computeCookieSecurityContext({
      host: 'roomsily.com',
      protocol: 'https',
    })

    const normalized = withSupabaseCookieDefaults(
      { sameSite: 'strict' },
      context,
    )

    expect(normalized.sameSite).toBe('strict')
    expect(normalized.httpOnly).toBe(true)
    expect(normalized.secure).toBe(true)
  })

  it('converts unsafe SameSite directives to lax', () => {
    const context = computeCookieSecurityContext({
      host: 'roomsily.com',
      protocol: 'https',
    })

    const normalized = withSupabaseCookieDefaults(
      { sameSite: 'none' } as CookieOptions,
      context,
    )

    expect(normalized.sameSite).toBe('lax')
  })

  it('omits domain and secure flags for localhost', () => {
    const context = computeCookieSecurityContext({
      host: 'localhost:3000',
      protocol: 'http',
    })

    const normalized = withSupabaseCookieDefaults({}, context)

    expect(context.domain).toBeUndefined()
    expect(context.secure).toBe(false)
    expect(normalized.domain).toBeUndefined()
    expect(normalized.secure).toBe(false)
    expect(normalized.httpOnly).toBe(true)
  })

  it('respects explicit insecure overrides', () => {
    const context = computeCookieSecurityContext({
      host: 'roomsily.com',
      protocol: 'https',
      allowInsecure: true,
    })

    const normalized = withSupabaseCookieDefaults({}, context)

    expect(context.secure).toBe(false)
    expect(normalized.secure).toBe(false)
  })

  it('prefers configured domains over derived hosts', () => {
    const context = computeCookieSecurityContext({
      envDomain: '.roomsily.com',
      host: 'sub.roomsily.com',
      protocol: 'https',
    })

    const normalized = withSupabaseCookieDefaults(
      { domain: 'ignored.roomsily.com' },
      context,
    )

    expect(context.domain).toBe('.roomsily.com')
    expect(normalized.domain).toBe('.roomsily.com')
  })

  it('derives domains from forwarded host headers', () => {
    const context = computeCookieSecurityContext({
      forwardedHost: 'api.roomsily.com:8443',
      protocol: 'https',
    })

    expect(context.domain).toBe('api.roomsily.com')
    expect(context.secure).toBe(true)
  })
})
