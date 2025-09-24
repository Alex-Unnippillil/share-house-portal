import { describe, expect, it } from 'vitest'

import {
  evaluateTenantSecurity,
  isIpAllowed,
  resolveClientIp,
} from '@/lib/security/tenant-policy'

describe('isIpAllowed', () => {
  it('allows when no CIDRs are configured', () => {
    expect(isIpAllowed('203.0.113.10', [])).toBe(true)
  })

  it('validates IPv4 addresses against CIDR ranges', () => {
    expect(isIpAllowed('203.0.113.10', ['203.0.113.0/24'])).toBe(true)
    expect(isIpAllowed('198.51.100.10', ['203.0.113.0/24'])).toBe(false)
  })

  it('validates IPv6 addresses against CIDR ranges', () => {
    expect(isIpAllowed('2001:db8::1', ['2001:db8::/48'])).toBe(true)
    expect(isIpAllowed('2001:db8:abcd::1', ['2001:db8::/64'])).toBe(false)
  })
})

describe('resolveClientIp', () => {
  it('prefers the first forwarded IP when available', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.1, 203.0.113.4',
    })
    expect(resolveClientIp(headers)).toBe('198.51.100.1')
  })

  it('falls back to provided fallback IP', () => {
    const headers = new Headers()
    expect(resolveClientIp(headers, '192.0.2.3')).toBe('192.0.2.3')
  })
})

describe('evaluateTenantSecurity', () => {
  const now = new Date('2024-06-01T12:00:00Z')

  it('allows sessions that meet both IP and TTL requirements', () => {
    const result = evaluateTenantSecurity({
      requestIp: '203.0.113.10',
      allowedCidrs: ['203.0.113.0/24'],
      sessionTtlSeconds: 60 * 60 * 4,
      lastSignInAt: new Date('2024-06-01T10:30:00Z').toISOString(),
      now,
    })

    expect(result).toEqual({ allowed: true })
  })

  it('blocks sessions outside the configured TTL', () => {
    const result = evaluateTenantSecurity({
      requestIp: '203.0.113.10',
      allowedCidrs: ['203.0.113.0/24'],
      sessionTtlSeconds: 60 * 30,
      lastSignInAt: new Date('2024-06-01T10:00:00Z').toISOString(),
      now,
    })

    expect(result).toEqual({ allowed: false, reason: 'ttl' })
  })

  it('blocks sessions from IPs outside the allowlist', () => {
    const result = evaluateTenantSecurity({
      requestIp: '198.51.100.10',
      allowedCidrs: ['203.0.113.0/24'],
      sessionTtlSeconds: null,
      lastSignInAt: new Date('2024-06-01T11:00:00Z').toISOString(),
      now,
    })

    expect(result).toEqual({ allowed: false, reason: 'ip' })
  })
})
