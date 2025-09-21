import { prefetchQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { cookies } from 'next/headers'

import { getBuildingById } from '@/queries/building-by-id'
import useSupabaseServer from '@/utils/supabase-server'

import Building from './building'

export default async function BuildingPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient()
  const cookieStore = cookies()
  const supabase = useSupabaseServer(cookieStore)

  await prefetchQuery(queryClient, getBuildingById(supabase, params.id))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Building id={params.id} />
    </HydrationBoundary>
  )
}
