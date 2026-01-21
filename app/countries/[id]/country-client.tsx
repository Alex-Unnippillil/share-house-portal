'use client'

import { useQuery } from '@tanstack/react-query'

import { getCountryById } from '@/queries/country-by-id'
import useSupabaseBrowser from '@/utils/supabase-browser'

export default function CountryClient({ id }: { id: number }) {
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
