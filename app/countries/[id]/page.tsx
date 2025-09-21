'use client'

import useSupabaseBrowser from '@/utils/supabase-browser'
import { getCountryById } from '@/queries/country-by-id'
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

export default function CountryPage({ params }: { params: { id: string } }) {
  const supabase = useSupabaseBrowser()
  const {
    data: building,
    isLoading,
    isError,
  } = useQuery(getCountryById(supabase, params.id))

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isError || !building) {
    return <div>Error</div>
  }

  return (
    <div>
      <h1>{building.name}</h1>
      <dl>
        <div>
          <dt className="font-medium">Code</dt>
          <dd>{building.code}</dd>
        </div>
        <div>
          <dt className="font-medium">Timezone</dt>
          <dd>{building.timezone}</dd>
        </div>
        <div>
          <dt className="font-medium">Status</dt>
          <dd>{building.is_active ? 'Active' : 'Inactive'}</dd>
        </div>
      </dl>
    </div>
  )
}