'use client'

import useSupabaseBrowser from '@/utils/supabase-browser'
import { getCountryById } from '@/queries/country-by-id'
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

type Country = {
  id: number
  name: string
}

export default function CountryPage({ params }: { params: { id: number } }) {
  const supabase = useSupabaseBrowser()
  const {
    data: country,
    isLoading,
    isError,
  } = useQuery<Country>(getCountryById(supabase, params.id))

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isError || !country) {
    return <div>Error</div>
  }

  return (
    <div>
      <h1>{country.name}</h1>
    </div>
  )
}