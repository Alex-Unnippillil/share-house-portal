'use client'

import { useMemo } from 'react'

import { createBrowserClient } from '@/lib/supabase-client'
import { getCountryById } from '@/queries/country-by-id'
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

export default function CountryPage({ params }: { params: { id: number } }) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const {
    data: country,
    isLoading,
    isError,
  } = useQuery(getCountryById(supabase, params.id))

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