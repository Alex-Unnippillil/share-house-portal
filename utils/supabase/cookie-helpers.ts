import { type CookieOptions } from '@supabase/ssr'
import { headers } from 'next/headers'

const LOOPBACK_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '0:0:0:0:0:0:0:1',
])

export interface CookieSecurityContext {
  domain?: string
  secure: boolean
}

export interface CookieSecurityInput {
  allowInsecure?: boolean
  defaultSecure?: boolean
  envDomain?: string | null
  forwardedHost?: string | null
  host?: string | null
  protocol?: string | null
}

export function getSupabaseCookieSecurityContext(): CookieSecurityContext {
  const headerList = headers()
  const forwardedHost = headerList.get('x-forwarded-host')
  const host = headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto')

  return computeCookieSecurityContext({
    envDomain: process.env.SUPABASE_COOKIE_DOMAIN,
    forwardedHost,
    host,
    protocol,
    allowInsecure: process.env.SUPABASE_ALLOW_INSECURE_COOKIES === 'true',
    defaultSecure: process.env.NODE_ENV !== 'development',
  })
}

export function computeCookieSecurityContext(
  input: CookieSecurityInput,
): CookieSecurityContext {
  const envDomain = sanitizeDomainInput(input.envDomain)
  const hostCandidate = sanitizeHostname(
    input.forwardedHost ? input.forwardedHost : input.host,
  )
  const hostname = envDomain ?? hostCandidate

  const resolvedDomain = resolveDomain(envDomain, hostCandidate)
  const secure = resolveSecureFlag({
    allowInsecure: input.allowInsecure,
    candidateHost: hostname,
    defaultSecure: input.defaultSecure,
    protocol: input.protocol,
  })

  return {
    domain: resolvedDomain,
    secure,
  }
}

export function withSupabaseCookieDefaults(
  options: CookieOptions,
  context: CookieSecurityContext,
): CookieOptions {
  const normalizedSameSite = normalizeSameSite(options.sameSite)
  const sanitizedDomain = resolveDomain(
    context.domain,
    sanitizeDomainInput(options.domain),
  )

  const normalized: CookieOptions = {
    ...options,
    httpOnly: true,
    sameSite: normalizedSameSite,
    secure: context.secure,
  }

  if (sanitizedDomain) {
    normalized.domain = sanitizedDomain
  } else {
    delete normalized.domain
  }

  return normalized
}

function resolveDomain(
  preferred: string | undefined,
  fallback: string | undefined,
): string | undefined {
  if (preferred && !isLocalHost(preferred)) {
    return preferred
  }

  if (fallback && !isLocalHost(fallback)) {
    return fallback
  }

  return undefined
}

function resolveSecureFlag({
  allowInsecure,
  candidateHost,
  defaultSecure,
  protocol,
}: {
  allowInsecure?: boolean
  candidateHost?: string
  defaultSecure?: boolean
  protocol?: string | null
}): boolean {
  if (allowInsecure) {
    return false
  }

  const normalizedProtocol = normalizeProtocol(protocol)

  if (normalizedProtocol) {
    return normalizedProtocol === 'https'
  }

  if (candidateHost) {
    return !isLocalHost(candidateHost)
  }

  return defaultSecure ?? true
}

function normalizeProtocol(value?: string | null): string | undefined {
  if (!value) {
    return undefined
  }

  const first = value.split(',')[0]?.trim().toLowerCase()

  if (!first) {
    return undefined
  }

  return first.endsWith(':') ? first.slice(0, -1) : first
}

function normalizeSameSite(
  sameSite: CookieOptions['sameSite'],
): 'lax' | 'strict' {
  if (typeof sameSite === 'string') {
    const normalized = sameSite.toLowerCase()
    if (normalized === 'strict') {
      return 'strict'
    }
    if (normalized === 'lax') {
      return 'lax'
    }
  }

  return 'lax'
}

function sanitizeDomainInput(value?: string | null): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  if (trimmed.startsWith('.')) {
    return trimmed
  }

  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).hostname || undefined
    } catch {
      // fall through to manual parsing
    }
  }

  if (trimmed.startsWith('[') && trimmed.includes(']')) {
    return trimmed.slice(1, trimmed.indexOf(']'))
  }

  if (trimmed.includes(':') && trimmed.includes('.')) {
    return trimmed.slice(0, trimmed.indexOf(':'))
  }

  return trimmed
}

function sanitizeHostname(value?: string | null): string | undefined {
  if (!value) {
    return undefined
  }

  const first = value.split(',')[0]?.trim()

  if (!first) {
    return undefined
  }

  if (first.includes('://')) {
    try {
      return new URL(first).hostname || undefined
    } catch {
      // fall through to manual parsing
    }
  }

  if (first.startsWith('[') && first.includes(']')) {
    return first.slice(1, first.indexOf(']'))
  }

  if (first.startsWith('.')) {
    return first
  }

  if (first.includes(':') && first.includes('.')) {
    return first.slice(0, first.indexOf(':'))
  }

  return first
}

function isLocalHost(host?: string): boolean {
  if (!host) {
    return false
  }

  const normalized = host.startsWith('.') ? host.slice(1) : host
  const lower = normalized.toLowerCase()

  if (LOOPBACK_HOSTNAMES.has(lower)) {
    return true
  }

  if (lower.endsWith('.local')) {
    return true
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(lower)) {
    return true
  }

  if (lower.includes(':') && !lower.includes('.')) {
    // Treat bare IPv6 hosts as local/loopback to avoid invalid cookie domains
    return true
  }

  return false
}
