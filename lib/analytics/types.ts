import type { Json } from '@/lib/supabase'

export const ANALYTICS_EVENT_TYPES = [
  'rent_payment_submitted',
  'rent_payment_failed',
  'amenity_booking_created',
  'document_signed',
  'maintenance_request_filed',
  'message_posted',
] as const

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]

export const GLOBAL_SCOPE = 'global'

export type AnalyticsEventInput = {
  eventType: AnalyticsEventType
  occurredAt?: Date
  actorId?: string | null
  unitId?: string | null
  metadata?: Record<string, unknown>
}

export type AnalyticsEventPayload = {
  event_type: AnalyticsEventType
  occurred_at: string
  actor_id: string | null
  unit_id: string | null
  metadata: Json
}

export type AnalyticsRollup = {
  rollupDate: string
  eventType: AnalyticsEventType
  scope: string
  eventCount: number
  uniqueActorCount: number
  metadata: Record<string, unknown>
}

export type FetchRollupsOptions = {
  from: Date
  to: Date
  eventTypes?: AnalyticsEventType[]
  scope?: string
}

export type TimeseriesPoint = {
  date: string
  counts: Record<AnalyticsEventType, number>
}

export type RollupSummary = {
  total: number
  peakUniqueActors: number
  firstEventAt?: string | null
  lastEventAt?: string | null
}
