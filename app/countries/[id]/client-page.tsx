'use client'

import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

import { getCountryById } from '@/queries/country-by-id'
import useSupabaseBrowser from '@/utils/supabase-browser'

type CountryPageClientProps = {
  id: number
}

export default function CountryPageClient({ id }: CountryPageClientProps) {
  const supabase = useSupabaseBrowser()
  const {
    data: country,
    isLoading,
    isError,
  } = useQuery(getCountryById(supabase, id))

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

