// app/posts/posts.jsx
'use client'

import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

import { getCountryById } from '@/queries/country-by-id'
import useSupabaseBrowser from '@/utils/supabase-browser'

type Country = {
  id: number
  name: string
}

export default function Country({ id }: { id: number }) {
  const supabase = useSupabaseBrowser()
  // This useQuery could just as well happen in some deeper
  // child to <Posts>, data will be available immediately either way
  const { data: country } = useQuery<Country>(getCountryById(supabase, id))

  return (
    <div>
      <h1>SSR: {country?.name}</h1>
    </div>
  )
}