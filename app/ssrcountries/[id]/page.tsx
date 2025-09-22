import { prefetchQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { createClient } from '@/utils/supa-server-actions'
import { cookies } from 'next/headers'
import Country from './country'
import { getCountryById } from '@/queries/country-by-id'
import { createServerQueryClient, dehydrateQueryClient } from '@/lib/react-query'
import { ReactQueryHydrate } from '@/components/react-query-hydrate'

export default async function CountryPage({ params }: { params: { id: number } }) {
  const queryClient = createServerQueryClient()
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  await prefetchQuery(queryClient, getCountryById(supabase, params.id))

  return (
    // Neat! Serialization is now as easy as passing props.
    // HydrationBoundary is a Client Component, so hydration will happen there.
    <ReactQueryHydrate state={dehydrateQueryClient(queryClient)}>
      <Country id={params.id} />
    </ReactQueryHydrate>
  )
}