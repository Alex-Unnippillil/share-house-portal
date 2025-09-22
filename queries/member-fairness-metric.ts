import type { Database } from '@/lib/supabase'
import { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export type MemberFairnessMetric =
  Database['public']['Views']['member_fairness_metrics']['Row']

const VIEW_NAME = 'member_fairness_metrics'
const FAIRNESS_FIELDS = `
  member_id,
  full_name,
  email,
  avatar_url,
  role,
  completed_count,
  missed_count,
  fairness_score,
  last_recorded_at
`

export function getMemberFairnessMetric(
  client: TypedSupabaseClient,
  memberId: string
) {
  return client
    .from(VIEW_NAME)
    .select(FAIRNESS_FIELDS)
    .eq('member_id', memberId)
    .maybeSingle()
}

export function listMemberFairnessMetrics(client: TypedSupabaseClient) {
  return client.from(VIEW_NAME).select(FAIRNESS_FIELDS)
}
