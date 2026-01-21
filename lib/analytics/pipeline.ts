import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/supabase'

import { ANALYTICS_EVENT_TYPES, type AnalyticsEventInput, type AnalyticsEventPayload, type AnalyticsEventType, type AnalyticsRollup, type FetchRollupsOptions } from './types'

export type SupabaseAnalyticsClient = SupabaseClient<Database>

let serviceRoleClient: SupabaseAnalyticsClient | null = null

function assertServerEnvironment() {
  if (typeof window !== 'undefined') {
    throw new Error('The analytics ingestion pipeline is only available in server environments.')
  }
}

function getServiceRoleClient(): SupabaseAnalyticsClient {
  assertServerEnvironment()

  if (serviceRoleClient) {
    return serviceRoleClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration for analytics ingestion.')
  }

  serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceRoleClient
}

function isAnalyticsEventType(value: string): value is AnalyticsEventType {
  return (ANALYTICS_EVENT_TYPES as readonly string[]).includes(value)
}

function sanitizeMetadata(metadata?: Record<string, unknown>): Json {
  if (!metadata) {
    return {}
  }

  const cleanedEntries = Object.entries(metadata).filter(([, value]) =>
    value !== undefined && typeof value !== 'function'
  )

  try {
    return JSON.parse(JSON.stringify(Object.fromEntries(cleanedEntries))) as Json
  } catch {
    return {}
  }
}

function normaliseEvent(event: AnalyticsEventInput): AnalyticsEventPayload {
  if (!isAnalyticsEventType(event.eventType)) {
    throw new Error(`Unsupported analytics event type: ${event.eventType}`)
  }

  const occurredAt = event.occurredAt ? new Date(event.occurredAt) : new Date()
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('Invalid occurredAt value provided to analytics pipeline.')
  }

  return {
    event_type: event.eventType,
    occurred_at: occurredAt.toISOString(),
    actor_id: event.actorId ?? null,
    unit_id: event.unitId ?? null,
    metadata: sanitizeMetadata(event.metadata),
  }
}

export class AnalyticsPipeline {
  constructor(private readonly supabase: SupabaseAnalyticsClient) {}

  async ingest(event: AnalyticsEventInput): Promise<void> {
    const payload = normaliseEvent(event)
    const { error } = await this.supabase.from('analytics_events').insert(payload)

    if (error) {
      throw new Error(`Failed to ingest analytics event: ${error.message}`)
    }
  }

  async ingestMany(events: AnalyticsEventInput[]): Promise<void> {
    const payloads = events.map(normaliseEvent)

    if (payloads.length === 0) {
      return
    }

    const { error } = await this.supabase.from('analytics_events').insert(payloads)

    if (error) {
      throw new Error(`Failed to ingest analytics events batch: ${error.message}`)
    }
  }

  async fetchRollups(options: FetchRollupsOptions): Promise<AnalyticsRollup[]> {
    const fromDate = options.from.toISOString().slice(0, 10)
    const toDate = options.to.toISOString().slice(0, 10)

    let query = this.supabase
      .from('analytics_daily_rollups')
      .select('rollup_date, event_type, scope, event_count, unique_actor_count, metadata')
      .gte('rollup_date', fromDate)
      .lte('rollup_date', toDate)
      .order('rollup_date', { ascending: true })
      .order('event_type', { ascending: true })

    if (options.eventTypes && options.eventTypes.length > 0) {
      query = query.in('event_type', options.eventTypes)
    }

    if (options.scope) {
      query = query.eq('scope', options.scope)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch analytics rollups: ${error.message}`)
    }

    return (data ?? []).map((row) => ({
      rollupDate: row.rollup_date,
      eventType: row.event_type as AnalyticsEventType,
      scope: row.scope,
      eventCount: row.event_count,
      uniqueActorCount: row.unique_actor_count,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }))
  }
}

export function createAnalyticsPipeline(options: { supabase?: SupabaseAnalyticsClient } = {}): AnalyticsPipeline {
  const client = options.supabase ?? getServiceRoleClient()
  return new AnalyticsPipeline(client)
}

export async function trackAnalyticsEvent(
  event: AnalyticsEventInput,
  options: { supabase?: SupabaseAnalyticsClient } = {}
): Promise<void> {
  const pipeline = createAnalyticsPipeline(options)
  await pipeline.ingest(event)
}
