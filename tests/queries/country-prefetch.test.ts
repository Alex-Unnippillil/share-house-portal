import { describe, expect, it } from 'vitest'

import {
  QueryClient,
  dehydrate,
  hydrate,
} from '@tanstack/react-query'

import { getCountryById, countryKeys } from '@/queries/country-by-id'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

const COUNTRY_FIXTURE = {
  id: 1,
  name: 'Testlandia',
}

interface CallCounter {
  count: number
}

const createMockQueryBuilder = (counter: CallCounter, data = COUNTRY_FIXTURE) => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      counter.count += 1
      return { data, error: null }
    },
  }

  return builder
}

const createMockSupabaseClient = (
  counter: CallCounter,
  data = COUNTRY_FIXTURE,
) => ({
  from: () => createMockQueryBuilder(counter, data),
}) as unknown as TypedSupabaseClient

describe('country queries', () => {
  it('creates stable query keys for country detail lookups', () => {
    expect(countryKeys.detail(42)).toEqual(['country', 42])

    const counter: CallCounter = { count: 0 }
    const supabase = createMockSupabaseClient(counter)
    const queryOptions = getCountryById(supabase, 42)

    expect(queryOptions.queryKey).toEqual(['country', 42])
    expect(counter.count).toBe(0)
  })

  it('hydrates prefetched country data without triggering duplicate fetches', async () => {
    const serverCalls: CallCounter = { count: 0 }
    const serverClient = new QueryClient()
    const serverSupabase = createMockSupabaseClient(serverCalls)
    const serverQuery = getCountryById(serverSupabase, COUNTRY_FIXTURE.id)

    await serverClient.prefetchQuery(serverQuery)
    expect(serverCalls.count).toBe(1)

    const dehydratedState = dehydrate(serverClient)

    const clientCalls: CallCounter = { count: 0 }
    const clientQueryClient = new QueryClient()
    hydrate(clientQueryClient, dehydratedState)
    const clientSupabase = createMockSupabaseClient(clientCalls)
    const clientQuery = getCountryById(clientSupabase, COUNTRY_FIXTURE.id)

    expect(clientQueryClient.getQueryData(clientQuery.queryKey)).toEqual(
      COUNTRY_FIXTURE,
    )

    await clientQueryClient.ensureQueryData(clientQuery)
    expect(clientCalls.count).toBe(0)

    serverClient.clear()
    clientQueryClient.clear()
  })
})
