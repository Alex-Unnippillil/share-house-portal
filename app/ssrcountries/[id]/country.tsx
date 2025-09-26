// app/posts/posts.jsx
'use client'

import { useMemo } from 'react'

import { createBrowserClient } from '@/lib/supabase-client'
import { getCountryById } from '@/queries/country-by-id'
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

export default function Country({ id }: { id: number }) {
  const supabase = useMemo(() => createBrowserClient(), [])
  // This useQuery could just as well happen in some deeper
  // child to <Posts>, data will be available immediately either way
  const { data: country } = useQuery(getCountryById(supabase, id))

  return (
    <div>
      <h1>SSR: {country?.name}</h1>
    </div>
  )
}