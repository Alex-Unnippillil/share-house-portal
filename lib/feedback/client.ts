import type { Database } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import { parseIsoDate, shouldDisplayCsatPrompt } from "./prompt-logic"

type FeedbackContext = Database['public']['Tables']['csat_responses']['Row']['context']

export async function canShowCsatPrompt(
  client: TypedSupabaseClient,
  {
    userId,
    context,
    contextId,
    cooldownHours,
    now,
  }: {
    userId: string
    context: FeedbackContext
    contextId?: string
    cooldownHours?: number
    now?: Date
  },
) {
  const existingQuery = client
    .from('csat_responses')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('context', context)
    .limit(1)

  const existingResponse = await (contextId
    ? existingQuery.eq('context_id', contextId)
    : existingQuery.is('context_id', null)
  ).maybeSingle()

  if (existingResponse.error) {
    throw existingResponse.error
  }

  const respondedToEvent = Boolean(existingResponse.data)

  const latestForContext = await client
    .from('csat_responses')
    .select('created_at')
    .eq('user_id', userId)
    .eq('context', context)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestForContext.error) {
    throw latestForContext.error
  }

  const lastResponseAt = parseIsoDate(latestForContext.data?.created_at ?? null)

  return shouldDisplayCsatPrompt({
    respondedToEvent,
    lastResponseAt,
    cooldownHours,
    now,
  })
}
