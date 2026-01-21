import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import type { Database, Json } from "@/lib/supabase"

const DOMAIN_ERROR_CONTEXT = "Failed to load custom domains"

export type CustomDomain = Database['public']['Tables']['custom_domains']['Row']
export type DomainCertificateEvent = Database['public']['Tables']['domain_certificate_events']['Row']
export interface DomainWithEvents extends CustomDomain {
  events: DomainCertificateEvent[]
}

interface SupabaseClientLike {
  from: TypedSupabaseClient['from']
}

function ensureNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

export async function fetchCustomDomains(
  client: SupabaseClientLike,
): Promise<CustomDomain[]> {
  const { data, error } = await client
    .from('custom_domains')
    .select('*')
    .order('created_at', { ascending: false })

  ensureNoError(error, DOMAIN_ERROR_CONTEXT)

  return (data as CustomDomain[] | null | undefined) ?? []
}

export async function fetchDomainCertificateEvents(
  client: SupabaseClientLike,
  domainIds?: string[],
): Promise<DomainCertificateEvent[]> {
  let query = client
    .from('domain_certificate_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (domainIds?.length) {
    query = query.in('domain_id', domainIds)
  }

  const { data, error } = await query

  ensureNoError(error, 'Failed to load domain certificate events')

  return (data as DomainCertificateEvent[] | null | undefined) ?? []
}

export interface DomainDnsRecord {
  type: string
  host?: string | null
  value: string
  ttl?: number | null
  description?: string | null
}

export function parseDnsRecords(dnsRecords: Json | null): DomainDnsRecord[] {
  if (!dnsRecords || typeof dnsRecords !== 'object') {
    return []
  }

  if (!Array.isArray(dnsRecords)) {
    return []
  }

  return dnsRecords
    .map((record) => {
      if (!record || typeof record !== 'object') {
        return null
      }
      const typedRecord = record as Record<string, unknown>
      const type = typeof typedRecord.type === 'string' ? typedRecord.type : 'CNAME'
      const host =
        typeof typedRecord.host === 'string' ? typedRecord.host : typedRecord.name
      const value = typeof typedRecord.value === 'string' ? typedRecord.value : null
      const ttl =
        typeof typedRecord.ttl === 'number'
          ? typedRecord.ttl
          : typeof typedRecord.ttl === 'string'
            ? Number.parseInt(typedRecord.ttl, 10)
            : null
      const description =
        typeof typedRecord.description === 'string'
          ? typedRecord.description
          : null

      if (!value) {
        return null
      }

      return {
        type,
        host: typeof host === 'string' ? host : null,
        value,
        ttl,
        description,
      }
    })
    .filter((record): record is DomainDnsRecord => Boolean(record))
}

export function groupEventsByDomain(
  events: DomainCertificateEvent[],
): Map<string, DomainCertificateEvent[]> {
  return events.reduce((acc, event) => {
    const existing = acc.get(event.domain_id) ?? []
    existing.push(event)
    acc.set(event.domain_id, existing)
    return acc
  }, new Map<string, DomainCertificateEvent[]>())
}

export async function loadDomainManagementData(client: SupabaseClientLike) {
  const domains = await fetchCustomDomains(client)
  const events = await fetchDomainCertificateEvents(
    client,
    domains.map((domain) => domain.id),
  )

  const eventMap = groupEventsByDomain(events)

  const decorated: DomainWithEvents[] = domains.map((domain) => ({
    ...domain,
    events: eventMap.get(domain.id) ?? [],
  }))

  return { domains: decorated, events }
}
