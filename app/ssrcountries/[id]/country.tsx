// app/posts/posts.jsx
'use client'

import useSupabaseBrowser from '@/utils/supabase-browser'
import { getCountryById } from '@/queries/country-by-id'
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

export default function Country({ id }: { id: string }) {
  const supabase = useSupabaseBrowser()
  // This useQuery could just as well happen in some deeper
  // child to <Posts>, data will be available immediately either way
  const { data: building } = useQuery(getCountryById(supabase, id))

  return (
    <div>
      <h1>SSR: {building?.name}</h1>
    </div>
  )
}