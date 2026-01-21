// app/posts/posts.jsx
'use client'

import { useQuery } from '@tanstack/react-query'

import { getCountryById } from '@/queries/country-by-id'
import useSupabaseBrowser from '@/utils/supabase-browser'

export default function Country({ id }: { id: number }) {
  const supabase = useSupabaseBrowser()
  // This useQuery could just as well happen in some deeper
  // child to <Posts>, data will be available immediately either way
  const { data: country } = useQuery(getCountryById(supabase, id))

  return (
    <div>
      <h1>SSR: {country?.name}</h1>
    </div>
  )
}