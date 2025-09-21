'use client'

import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

import { getBuildingById } from '@/queries/building-by-id'
import useSupabaseBrowser from '@/utils/supabase-browser'

export default function BuildingPage({ params }: { params: { id: string } }) {
  const supabase = useSupabaseBrowser()
  const {
    data: building,
    isLoading,
    isError,
  } = useQuery(getBuildingById(supabase, params.id))

  if (isLoading) {
    return <div>Loading…</div>
  }

  if (isError || !building) {
    return <div>Unable to load building.</div>
  }

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{building.name}</h1>
      <dl className="space-y-1 text-sm text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Code</dt>
          <dd>{building.code}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Timezone</dt>
          <dd>{building.timezone}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Status</dt>
          <dd>{building.is_active ? 'Active' : 'Inactive'}</dd>
        </div>
      </dl>
    </div>
  )
}
