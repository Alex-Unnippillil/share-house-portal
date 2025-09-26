import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prefetchQuery } from '@supabase-cache-helpers/postgrest-react-query'

import { getCountryById } from '@/queries/country-by-id'
import { createClient } from '@/utils/supa-server-actions'

import Country from './country'

export const revalidate = 0

type CountryPageProps = {
  params: {
    id: string
  }
}

export default async function CountryPage({ params }: CountryPageProps) {
  const queryClient = new QueryClient()
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const id = Number(params.id)

  if (Number.isNaN(id)) {
    notFound()
  }

  await prefetchQuery(queryClient, getCountryById(supabase, id))

  return (
    // Neat! Serialization is now as easy as passing props.
    // HydrationBoundary is a Client Component, so hydration will happen there.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Country id={id} />
    </HydrationBoundary>
  )
}
