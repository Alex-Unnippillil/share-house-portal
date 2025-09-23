import "server-only"

import { cache } from "react"

import { computeFeedbackAnalytics } from "@/lib/feedback/analytics"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export type FeedbackAnalytics = ReturnType<typeof computeFeedbackAnalytics>

type NpsRow = Database['public']['Tables']['nps_responses']['Row']
type CsatRow = Database['public']['Tables']['csat_responses']['Row']

async function fetchFeedbackAnalytics() {
  const supabase = await createSupbaseServerClientReadOnly()
  const now = new Date()
  const since = new Date(now)
  since.setMonth(since.getMonth() - 6)

  const sinceIso = since.toISOString()

  const { data: npsData, error: npsError } = await supabase
    .from('nps_responses')
    .select('score, created_at, feedback')
    .gte('created_at', sinceIso)

  if (npsError) {
    console.error('Unable to load NPS analytics', npsError)
  }

  const { data: csatData, error: csatError } = await supabase
    .from('csat_responses')
    .select('rating, context, created_at')
    .gte('created_at', sinceIso)

  if (csatError) {
    console.error('Unable to load CSAT analytics', csatError)
  }

  return computeFeedbackAnalytics(
    (npsData ?? []) as NpsRow[],
    (csatData ?? []) as CsatRow[],
    now,
  )
}

export const getFeedbackAnalytics = cache(fetchFeedbackAnalytics)
