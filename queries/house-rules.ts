import type { PostgrestError } from '@supabase/supabase-js'

import type { HouseRule } from '@/lib/house-rules'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export async function getHouseRulesHistory(
  client: TypedSupabaseClient,
): Promise<{ data: HouseRule[]; error: PostgrestError | null }> {
  return client
    .from('house_rules')
    .select('*')
    .order('version', { ascending: false })
    .order('published_at', { ascending: false })
}

export async function getLatestHouseRuleRecord(
  client: TypedSupabaseClient,
): Promise<{ data: HouseRule | null; error: PostgrestError | null }> {
  const { data, error } = await client
    .from('house_rules')
    .select('*')
    .order('version', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(1)

  return { data: data?.[0] ?? null, error }
}
