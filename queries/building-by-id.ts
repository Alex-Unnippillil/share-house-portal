import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export function getBuildingById(client: TypedSupabaseClient, buildingId: string) {
  return client
    .from('buildings')
    .select(
      `
      id,
      name,
      code,
      timezone,
      is_active
    `
    )
    .eq('id', buildingId)
    .throwOnError()
    .single()
}
