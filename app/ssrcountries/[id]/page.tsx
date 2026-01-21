import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { createClient } from '@/utils/supa-server-actions'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Country from './country'
import { getCountryById } from '@/queries/country-by-id'

export default async function CountryPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient()
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const countryId = Number(params.id)

  if (!Number.isFinite(countryId)) {
    notFound()
  }

  await queryClient.prefetchQuery(getCountryById(supabase, countryId))

  return (
    // Neat! Serialization is now as easy as passing props.
    // HydrationBoundary is a Client Component, so hydration will happen there.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Country id={countryId} />
    </HydrationBoundary>
  )
}