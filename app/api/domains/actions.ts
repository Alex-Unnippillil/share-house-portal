'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createSupbaseServerClient } from '@/utils/supaone'
import type { Database } from '@/lib/supabase'

const DOMAIN_PATH = '/dashboard/domains'
const RENEWAL_BUFFER_DAYS = 14

const domainInputSchema = z.object({
  domain: z
    .string()
    .min(3, 'Domain name is required')
    .max(255, 'Domain name is too long')
    .regex(/^[a-z0-9.-]+$/i, 'Only alphanumeric characters, dots, and hyphens are allowed')
    .transform((value) => value.toLowerCase()),
  projectId: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

type DomainInput = z.infer<typeof domainInputSchema>

type CustomDomainRow = Database['public']['Tables']['custom_domains']['Row']
type CertificateStatus = CustomDomainRow['certificate_status']
type VerificationStatus = CustomDomainRow['verification_status']

type NormalizedDnsRecord = {
  type: string
  host: string | null
  value: string
  ttl: number | null
  description: string | null
}

type DomainActionPayload = {
  domainId: string
  domain: string
  verificationStatus: VerificationStatus
  certificateStatus: CertificateStatus
  certificateExpiresAt: string | null
  renewalScheduledFor: string | null
  dnsRecords: NormalizedDnsRecord[]
  fallback: boolean
}

type DomainActionResult =
  | {
      success: true
      message: string
      data: DomainActionPayload
    }
  | {
      success: false
      error: string
      details?: Record<string, unknown>
    }

class IntegrationNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IntegrationNotConfiguredError'
  }
}

class VercelRequestError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'VercelRequestError'
    this.status = status
    this.body = body
  }
}

interface VercelDomainPayload {
  name?: string
  configured?: boolean
  verified?: boolean
  verification?: Array<Record<string, unknown>>
  verificationRecord?: Record<string, unknown>
  cname?: string
  certificate?: Record<string, unknown>
  renewal?: Record<string, unknown>
  projectId?: string
}

interface CertificateInfo {
  id: string | null
  status: string | null
  issuedAt: string | null
  expiresAt: string | null
  autoRenew: boolean
  renewalScheduledFor: string | null
}

export type { NormalizedDnsRecord, DomainActionResult, DomainActionPayload }

function normalizeDomain(input: string) {
  return input.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

function getProjectIdFromInput(projectId?: string) {
  return (
    projectId ||
    process.env.VERCEL_PROJECT_ID ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID ||
    null
  )
}

async function vercelRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.VERCEL_ACCESS_TOKEN
  if (!token) {
    throw new IntegrationNotConfiguredError(
      'VERCEL_ACCESS_TOKEN is not configured. Recording placeholder DNS targets.'
    )
  }

  const baseUrl = (process.env.VERCEL_API_BASE ?? 'https://api.vercel.com').replace(/\/$/, '')
  const url = new URL(`${baseUrl}/${path.replace(/^\//, '')}`)
  const teamId = process.env.VERCEL_TEAM_ID || process.env.NEXT_PUBLIC_VERCEL_TEAM_ID
  if (teamId) {
    url.searchParams.set('teamId', teamId)
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? (body as { error?: { message?: string } }).error?.message || response.statusText
        : response.statusText
    throw new VercelRequestError(message, response.status, body)
  }

  return body as T
}

async function createOrFetchDomain(
  projectId: string,
  domain: string,
): Promise<VercelDomainPayload | null> {
  try {
    return await vercelRequest<VercelDomainPayload>(`v9/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })
  } catch (error) {
    if (error instanceof VercelRequestError && error.status === 409) {
      return await vercelRequest<VercelDomainPayload>(
        `v9/projects/${projectId}/domains/${domain}`,
        { method: 'GET' },
      )
    }
    throw error
  }
}

async function fetchDomainDetails(
  projectId: string,
  domain: string,
): Promise<VercelDomainPayload | null> {
  try {
    return await vercelRequest<VercelDomainPayload>(
      `v9/projects/${projectId}/domains/${domain}`,
    )
  } catch (error) {
    if (error instanceof IntegrationNotConfiguredError) {
      throw error
    }
    if (error instanceof VercelRequestError && error.status === 404) {
      return null
    }
    throw error
  }
}

function buildFallbackDnsRecords(domain: string, projectId: string | null): NormalizedDnsRecord[] {
  const projectSlug = projectId?.replace(/[^a-z0-9-]+/gi, '').toLowerCase() || 'roomsily'
  const sanitizedDomain = domain.replace(/^\*\./, 'wildcard-').replace(/\./g, '-')

  return [
    {
      type: 'CNAME',
      host: 'www',
      value: `${projectSlug}.cname.vercel-dns.com`,
      ttl: 300,
      description: 'Routes tenant traffic for the www host through Vercel.',
    },
    {
      type: 'CNAME',
      host: '_acme-challenge',
      value: `${sanitizedDomain}.acm.vercel-dns.com`,
      ttl: 300,
      description: 'Enables automatic TLS renewals via ACME.',
    },
  ]
}

function hostFromFqdn(fqdn: unknown, domain: string) {
  if (typeof fqdn !== 'string' || !fqdn.length) {
    return null
  }
  if (fqdn === domain) {
    return '@'
  }
  if (fqdn.endsWith(`.${domain}`)) {
    return fqdn.slice(0, fqdn.length - (domain.length + 1))
  }
  return fqdn
}

function normalizeDnsRecords(
  domain: string,
  payload: VercelDomainPayload | null,
  fallback: NormalizedDnsRecord[],
): NormalizedDnsRecord[] {
  const records: NormalizedDnsRecord[] = []
  const verificationEntries = Array.isArray(payload?.verification)
    ? payload?.verification
    : []

  for (const entry of verificationEntries) {
    if (!entry || typeof entry !== 'object') continue
    const typeValue = entry.type
    const value = entry.value
    if (typeof value !== 'string') continue
    const type = typeof typeValue === 'string' ? typeValue.toUpperCase() : 'CNAME'
    if (type !== 'CNAME' && type !== 'TXT') continue
    const host = hostFromFqdn(entry.domain ?? entry.host, domain)
    const ttl =
      typeof entry.ttl === 'number'
        ? entry.ttl
        : typeof entry.ttl === 'string'
          ? Number.parseInt(entry.ttl, 10)
          : null
    const description =
      typeof entry.reason === 'string'
        ? entry.reason
        : type === 'TXT'
          ? 'TXT verification required before issuing certificates.'
          : null

    records.push({
      type,
      host: host ?? null,
      value,
      ttl,
      description,
    })
  }

  if (payload?.verificationRecord && typeof payload.verificationRecord === 'object') {
    const entry = payload.verificationRecord
    const type = typeof entry.type === 'string' ? entry.type.toUpperCase() : 'CNAME'
    const value = typeof entry.value === 'string' ? entry.value : null
    if (value) {
      records.push({
        type,
        host: hostFromFqdn(entry.domain, domain),
        value,
        ttl:
          typeof entry.ttl === 'number'
            ? entry.ttl
            : typeof entry.ttl === 'string'
              ? Number.parseInt(entry.ttl, 10)
              : null,
        description: null,
      })
    }
  }

  if (typeof payload?.cname === 'string') {
    records.push({
      type: 'CNAME',
      host: 'www',
      value: payload.cname,
      ttl: 300,
      description: 'Primary Vercel CNAME target.',
    })
  }

  const merged = new Map<string, NormalizedDnsRecord>()
  for (const record of [...fallback, ...records]) {
    const key = `${record.type}:${record.host ?? ''}`.toLowerCase()
    merged.set(key, record)
  }

  return Array.from(merged.values())
}

function extractVerificationMetadata(
  records: NormalizedDnsRecord[],
): { type: string | null; token: string | null } {
  const preferred = records.find((record) => record.type === 'CNAME') || records[0]
  if (!preferred) {
    return { type: null, token: null }
  }
  return { type: preferred.type, token: preferred.value }
}

function toIsoDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }
  return null
}

function extractCertificateInfo(payload: VercelDomainPayload | null): CertificateInfo {
  const certificate = payload?.certificate && typeof payload.certificate === 'object'
    ? payload.certificate
    : null

  if (!certificate) {
    const fallbackExpires = toIsoDate(Date.now() + 90 * 24 * 60 * 60 * 1000)
    return {
      id: null,
      status: null,
      issuedAt: null,
      expiresAt: fallbackExpires,
      autoRenew: true,
      renewalScheduledFor: computeRenewalSchedule(fallbackExpires),
    }
  }

  const status =
    typeof certificate.status === 'string'
      ? certificate.status
      : typeof certificate.state === 'string'
        ? certificate.state
        : null
  const issuedAt = toIsoDate(certificate.issuedAt ?? certificate.createdAt)
  const expiresAt = toIsoDate(
    certificate.expiresAt ?? certificate.expiration ?? certificate.validTo,
  )
  const autoRenew =
    typeof certificate.autoRenew === 'boolean'
      ? certificate.autoRenew
      : typeof certificate.autoRenewal === 'boolean'
        ? certificate.autoRenewal
        : true
  const renewalScheduledFor = computeRenewalSchedule(
    toIsoDate(certificate.renewAt ?? certificate.nextRenewalAttempt),
  )

  return {
    id:
      typeof certificate.id === 'string'
        ? certificate.id
        : typeof certificate.uid === 'string'
          ? certificate.uid
          : null,
    status,
    issuedAt,
    expiresAt,
    autoRenew,
    renewalScheduledFor,
  }
}

function computeRenewalSchedule(expiresAt?: string | null) {
  if (!expiresAt) {
    return new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  }
  const expiry = Date.parse(expiresAt)
  if (Number.isNaN(expiry)) {
    return new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  }
  const bufferMs = RENEWAL_BUFFER_DAYS * 24 * 60 * 60 * 1000
  const scheduled = expiry - bufferMs
  if (scheduled <= Date.now()) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  return new Date(scheduled).toISOString()
}

function mapCertificateStatus(status: string | null): CertificateStatus {
  switch (status?.toLowerCase()) {
    case 'issued':
    case 'ready':
    case 'active':
      return 'active'
    case 'renewing':
    case 'pending_renewal':
      return 'renewing'
    case 'failed':
    case 'error':
      return 'failed'
    case 'expired':
      return 'expired'
    default:
      return 'pending'
  }
}

async function logDomainEvent(
  supabase: Awaited<ReturnType<typeof createSupbaseServerClient>>,
  domainId: string,
  userId: string | null,
  event: {
    event_type: Database['public']['Tables']['domain_certificate_events']['Row']['event_type']
    status?: Database['public']['Tables']['domain_certificate_events']['Row']['status']
    message: string
    metadata?: Record<string, unknown>
  },
) {
  try {
    await (supabase as any)
      .from('domain_certificate_events')
      .insert({
        domain_id: domainId,
        event_type: event.event_type,
        status: event.status ?? 'info',
        message: event.message,
        metadata: event.metadata ?? null,
        created_by: userId,
      })
  } catch (error) {
    console.error('Failed to log domain event', error)
  }
}

function sanitizeDnsRecords(records: NormalizedDnsRecord[]) {
  return records.map((record) => ({
    type: record.type,
    host: record.host,
    value: record.value,
    ttl: record.ttl,
    description: record.description,
  }))
}

async function upsertDomainRecord(
  supabase: Awaited<ReturnType<typeof createSupbaseServerClient>>,
  input: { domain: string; projectId: string | null; userId: string },
  payload: VercelDomainPayload | null,
  options: { fallback: boolean; fallbackReason?: string; verificationStatus?: VerificationStatus },
) {
  const fallbackRecords = buildFallbackDnsRecords(input.domain, input.projectId)
  const dnsRecords = normalizeDnsRecords(input.domain, payload, fallbackRecords)
  const verificationMetadata = extractVerificationMetadata(dnsRecords)
  const certificateInfo = extractCertificateInfo(payload)

  const verificationStatus = options.verificationStatus ?? (payload?.configured || payload?.verified ? 'verified' : 'pending')
  const certificateStatus = mapCertificateStatus(certificateInfo.status)

  const metadata: Record<string, unknown> = {
    integration: 'vercel',
    fallback: options.fallback,
    fallbackReason: options.fallbackReason ?? null,
    vercelConfigured: payload?.configured ?? null,
  }

  const recordPayload = {
    project_id: input.projectId,
    verification_status: verificationStatus,
    verification_type: verificationMetadata.type,
    verification_token: verificationMetadata.token,
    dns_target: dnsRecords[0]?.value ?? null,
    dns_records: sanitizeDnsRecords(dnsRecords),
    certificate_id: certificateInfo.id,
    certificate_status: certificateStatus,
    certificate_issued_at: certificateInfo.issuedAt,
    certificate_expires_at: certificateInfo.expiresAt,
    auto_renew: certificateInfo.autoRenew,
    renewal_scheduled_for:
      certificateInfo.renewalScheduledFor ?? computeRenewalSchedule(certificateInfo.expiresAt),
    last_checked_at: new Date().toISOString(),
    last_error: null,
    metadata,
  }

  const { data: existing } = await (supabase as any)
    .from('custom_domains')
    .select('*')
    .eq('domain', input.domain)
    .maybeSingle()

  if (existing) {
    const { data: updated, error } = await (supabase as any)
      .from('custom_domains')
      .update(recordPayload)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }
    return { record: updated as CustomDomainRow, dnsRecords, verificationStatus, certificateStatus }
  }

  const { data: inserted, error } = await (supabase as any)
    .from('custom_domains')
    .insert({
      domain: input.domain,
      project_id: input.projectId,
      created_by: input.userId,
      ...recordPayload,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return { record: inserted as CustomDomainRow, dnsRecords, verificationStatus, certificateStatus }
}

export async function provisionCustomDomain(input: DomainInput): Promise<DomainActionResult> {
  const parsed = domainInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join(', '),
    }
  }

  const normalizedDomain = normalizeDomain(parsed.data.domain)
  const projectId = getProjectIdFromInput(parsed.data.projectId)

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { success: false, error: userError.message }
  }

  if (!user) {
    return { success: false, error: 'You must be signed in to manage domains.' }
  }

  let payload: VercelDomainPayload | null = null
  let fallback = false
  let fallbackReason: string | undefined

  if (projectId) {
    try {
      payload = await createOrFetchDomain(projectId, normalizedDomain)
    } catch (error) {
      if (error instanceof IntegrationNotConfiguredError) {
        fallback = true
        fallbackReason = error.message
      } else if (error instanceof VercelRequestError) {
        fallback = true
        fallbackReason = `Vercel responded with ${error.status}: ${error.message}`
      } else {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  } else {
    fallback = true
    fallbackReason = 'VERCEL_PROJECT_ID is not configured. Saved DNS guidance only.'
  }

  try {
    const { record, dnsRecords, verificationStatus, certificateStatus } =
      await upsertDomainRecord(
        supabase,
        { domain: normalizedDomain, projectId, userId: user.id },
        payload,
        { fallback, fallbackReason },
      )

    await logDomainEvent(supabase, record.id, user.id, {
      event_type: 'provisioned',
      status: fallback ? 'warning' : 'info',
      message: fallback
        ? 'Domain saved with placeholder DNS records. Configure Vercel credentials to automate provisioning.'
        : 'Domain registered with Vercel. Add the DNS records to complete verification.',
      metadata: {
        dnsRecords,
        fallbackReason: fallbackReason ?? null,
      },
    })

    revalidatePath(DOMAIN_PATH)

    return {
      success: true,
      message: fallback
        ? 'Domain recorded. Add the DNS records below and configure Vercel credentials to enable automation.'
        : 'Domain registered with Vercel. Add the DNS records below to verify ownership.',
      data: {
        domainId: record.id,
        domain: record.domain,
        verificationStatus,
        certificateStatus,
        certificateExpiresAt: record.certificate_expires_at,
        renewalScheduledFor: record.renewal_scheduled_for,
        dnsRecords: sanitizeDnsRecords(dnsRecords),
        fallback,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record domain',
    }
  }
}

export async function verifyCustomDomain(domainId: string): Promise<DomainActionResult> {
  if (!domainId) {
    return { success: false, error: 'Domain identifier is required.' }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { success: false, error: userError.message }
  }

  if (!user) {
    return { success: false, error: 'You must be signed in to verify domains.' }
  }

  const { data: domain, error: fetchError } = await (supabase as any)
    .from('custom_domains')
    .select('*')
    .eq('id', domainId)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!domain) {
    return { success: false, error: 'Domain not found.' }
  }

  const projectId = getProjectIdFromInput(domain.project_id ?? undefined)

  let payload: VercelDomainPayload | null = null
  let fallback = false
  let fallbackReason: string | undefined

  if (projectId) {
    try {
      await vercelRequest(`v9/projects/${projectId}/domains/${domain.domain}/verify`, {
        method: 'POST',
      })
      payload = await fetchDomainDetails(projectId, domain.domain)
    } catch (error) {
      if (error instanceof IntegrationNotConfiguredError) {
        fallback = true
        fallbackReason = error.message
      } else if (error instanceof VercelRequestError) {
        fallback = true
        fallbackReason = `Verification failed with ${error.status}: ${error.message}`
      } else if (error instanceof Error) {
        return { success: false, error: error.message }
      } else {
        return { success: false, error: 'Unknown verification error' }
      }
    }
  } else {
    fallback = true
    fallbackReason = 'No Vercel project ID configured. Cannot perform automated verification.'
  }

  try {
    const { record, dnsRecords, verificationStatus, certificateStatus } =
      await upsertDomainRecord(
        supabase,
        { domain: domain.domain, projectId, userId: user.id },
        payload,
        {
          fallback,
          fallbackReason,
          verificationStatus: fallback ? domain.verification_status : 'verified',
        },
      )

    await logDomainEvent(supabase, record.id, user.id, {
      event_type: fallback ? 'verification_failed' : 'verification_succeeded',
      status: fallback ? 'warning' : 'success',
      message: fallback
        ? fallbackReason ?? 'Verification requires manual DNS configuration.'
        : 'Domain ownership verified with Vercel. Certificates will issue automatically.',
      metadata: {
        dnsRecords,
        fallbackReason: fallbackReason ?? null,
      },
    })

    revalidatePath(DOMAIN_PATH)

    return {
      success: true,
      message: fallback
        ? 'Verification requires manual DNS updates. Review the DNS records below.'
        : 'Domain verified successfully. Certificate automation is now enabled.',
      data: {
        domainId: record.id,
        domain: record.domain,
        verificationStatus,
        certificateStatus,
        certificateExpiresAt: record.certificate_expires_at,
        renewalScheduledFor: record.renewal_scheduled_for,
        dnsRecords: sanitizeDnsRecords(dnsRecords),
        fallback,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update verification status',
    }
  }
}

export async function scheduleDomainRenewal(domainId: string): Promise<DomainActionResult> {
  if (!domainId) {
    return { success: false, error: 'Domain identifier is required.' }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { success: false, error: userError.message }
  }

  if (!user) {
    return { success: false, error: 'You must be signed in to manage renewals.' }
  }

  const { data: domain, error: fetchError } = await (supabase as any)
    .from('custom_domains')
    .select('*')
    .eq('id', domainId)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!domain) {
    return { success: false, error: 'Domain not found.' }
  }

  const projectId = getProjectIdFromInput(domain.project_id ?? undefined)

  let fallback = false
  let fallbackReason: string | undefined
  if (projectId) {
    try {
      await vercelRequest(`v9/projects/${projectId}/domains/${domain.domain}/certificates`, {
        method: 'POST',
      })
    } catch (error) {
      if (error instanceof IntegrationNotConfiguredError) {
        fallback = true
        fallbackReason = error.message
      } else if (error instanceof VercelRequestError) {
        fallback = true
        fallbackReason = `Renewal request failed with ${error.status}: ${error.message}`
      } else if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  } else {
    fallback = true
    fallbackReason = 'Vercel project ID not configured. Renewal scheduled locally only.'
  }

  const renewalDate = computeRenewalSchedule(domain.certificate_expires_at)
  const updatePayload = {
    certificate_status: fallback ? domain.certificate_status : 'renewing',
    renewal_scheduled_for: renewalDate,
    last_checked_at: new Date().toISOString(),
    last_error: fallback ? fallbackReason ?? null : null,
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from('custom_domains')
    .update(updatePayload)
    .eq('id', domain.id)
    .select('*')
    .maybeSingle()

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await logDomainEvent(supabase, domain.id, user.id, {
    event_type: fallback ? 'renewal_failed' : 'renewal_scheduled',
    status: fallback ? 'warning' : 'info',
    message: fallback
      ? fallbackReason ?? 'Scheduled local renewal reminder. Configure Vercel credentials for automation.'
      : 'Certificate renewal requested. Vercel will attempt issuance before expiry.',
    metadata: {
      renewalDate,
      fallbackReason: fallbackReason ?? null,
    },
  })

  revalidatePath(DOMAIN_PATH)

  return {
    success: true,
    message: fallback
      ? 'Renewal reminder scheduled locally. Configure Vercel credentials for full automation.'
      : 'Renewal scheduled. Vercel will attempt to renew the certificate before the buffer window.',
    data: {
      domainId: updated.id,
      domain: updated.domain,
      verificationStatus: updated.verification_status,
      certificateStatus: updated.certificate_status,
      certificateExpiresAt: updated.certificate_expires_at,
      renewalScheduledFor: updated.renewal_scheduled_for,
      dnsRecords: sanitizeDnsRecords(
        Array.isArray(updated.dns_records)
          ? (updated.dns_records as NormalizedDnsRecord[])
          : [],
      ),
      fallback,
    },
  }
}
