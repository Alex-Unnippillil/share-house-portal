import type { Database } from '@/lib/supabase'
import { getQuarterWindow, shouldTriggerQuarterlyNps, type QuarterWindow } from '@/lib/surveys'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>

type NpsRow = Database['public']['Tables']['nps_responses']['Row']
type NpsInsert = Database['public']['Tables']['nps_responses']['Insert']
type CsatInsert = Database['public']['Tables']['csat_responses']['Insert']

export type NpsResponseSummary = Pick<NpsRow, 'quarter_start' | 'quarter_end' | 'submitted_at' | 'score'>

export async function fetchLatestNpsResponse(
  client: SupabaseClientLike,
  userId: string
): Promise<NpsResponseSummary | null> {
  const { data, error } = await client
    .from('nps_responses')
    .select('quarter_start, quarter_end, submitted_at, score')
    .eq('user_id', userId)
    .order('quarter_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load NPS responses: ${error.message}`)
  }

  return (data as NpsResponseSummary | null) ?? null
}

export async function hasSubmittedNpsThisQuarter(
  client: SupabaseClientLike,
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const latest = await fetchLatestNpsResponse(client, userId)
  return !shouldTriggerQuarterlyNps(latest?.quarter_start ?? null, now)
}

export interface RecordNpsResponseArgs {
  client: SupabaseClientLike
  userId: string
  score: number
  feedback?: string | null
  metadata?: NpsInsert['metadata']
  quarter?: QuarterWindow
}

export async function recordNpsResponse({
  client,
  userId,
  score,
  feedback,
  metadata,
  quarter = getQuarterWindow(),
}: RecordNpsResponseArgs): Promise<void> {
  if (score < 0 || score > 10) {
    throw new RangeError('NPS score must be between 0 and 10')
  }

  const payload: NpsInsert = {
    user_id: userId,
    score,
    feedback: feedback?.trim() ? feedback.trim() : null,
    quarter_start: quarter.startDate,
    quarter_end: quarter.endDate,
    metadata: metadata ?? {},
  }

  const { error } = await client.from('nps_responses').insert(payload)

  if (error) {
    throw new Error(`Failed to record NPS response: ${error.message}`)
  }
}

export interface RecordCsatResponseArgs {
  client: SupabaseClientLike
  userId: string
  flow: string
  contextIdentifier: string
  score: number
  comment?: string | null
  metadata?: CsatInsert['metadata']
}

export async function recordCsatResponse({
  client,
  userId,
  flow,
  contextIdentifier,
  score,
  comment,
  metadata,
}: RecordCsatResponseArgs): Promise<void> {
  if (score < 1 || score > 5) {
    throw new RangeError('CSAT score must be between 1 and 5')
  }

  if (!contextIdentifier || contextIdentifier.trim().length < 3) {
    throw new Error('A valid CSAT context identifier is required')
  }

  const payload: CsatInsert = {
    user_id: userId,
    flow,
    context_identifier: contextIdentifier,
    score,
    comment: comment?.trim() ? comment.trim() : null,
    metadata: metadata ?? {},
  }

  const { error } = await client.from('csat_responses').insert(payload)

  if (error) {
    throw new Error(`Failed to record CSAT response: ${error.message}`)
  }
}
