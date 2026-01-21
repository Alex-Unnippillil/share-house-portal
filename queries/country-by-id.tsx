import type { PostgrestError } from '@supabase/postgrest-js'
import type { QueryOptions } from '@tanstack/react-query'

import { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export interface Country {
  id: number
  name: string
}

export const countryKeys = {
  detail: (countryId: number) => ['country', countryId] as const,
}

export async function fetchCountryById(
  client: TypedSupabaseClient,
  countryId: number,
): Promise<Country> {
  const { data, error } = await client
    .from('countries')
    .select(
      `
      id,
      name
    `,
    )
    .eq('id', countryId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(`Country ${countryId} not found`)
  }

  return data
}

export function getCountryById(
  client: TypedSupabaseClient,
  countryId: number,
): QueryOptions<Country, PostgrestError | Error, Country, ReturnType<typeof countryKeys.detail>> {
  const queryKey = countryKeys.detail(countryId)

  return {
    queryKey,
    queryFn: () => fetchCountryById(client, countryId),
  }
}