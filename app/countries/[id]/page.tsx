import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import CountryClient from './country-client'
import { getCountryById } from '@/queries/country-by-id'
import { createClient } from '@/utils/supa-server-actions'

export default async function CountryPage({
  params,
}: {
  params: { id: string }
}) {
  const countryId = Number(params.id)
  const queryClient = new QueryClient()

  if (!Number.isFinite(countryId)) {
    notFound()
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  await queryClient.prefetchQuery(getCountryById(supabase, countryId))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CountryClient id={countryId} />
    </HydrationBoundary>
  )
}