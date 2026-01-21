import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type NpsPayload = {
  userId: string
  windowId: string
  score: number
  feedback?: string
  metadata?: Record<string, unknown>
}

type CsatPayload = {
  userId: string
  context: 'document_signed' | 'maintenance_resolved'
  contextId?: string
  rating: number
  comment?: string
  metadata?: Record<string, unknown>
}

export async function persistNpsResponse(
  client: TypedSupabaseClient,
  { userId, windowId, score, feedback, metadata }: NpsPayload,
) {
  const { data, error } = await client
    .from('nps_responses')
    .insert({
      user_id: userId,
      window_id: windowId,
      score,
      feedback: feedback ?? null,
      metadata: metadata ?? null,
    })
    .select('id, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function persistCsatResponse(
  client: TypedSupabaseClient,
  { userId, context, contextId, rating, comment, metadata }: CsatPayload,
) {
  const query = client.from('csat_responses')

  const { data, error } = await query
    .insert({
      user_id: userId,
      context,
      context_id: contextId ?? null,
      rating,
      comment: comment ?? null,
      metadata: metadata ?? null,
    })
    .select('id, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}
