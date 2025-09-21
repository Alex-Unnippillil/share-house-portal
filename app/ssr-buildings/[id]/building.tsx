'use client'

import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'

import { getBuildingById } from '@/queries/building-by-id'
import useSupabaseBrowser from '@/utils/supabase-browser'

export default function Building({ id }: { id: string }) {
  const supabase = useSupabaseBrowser()
  const { data: building } = useQuery(getBuildingById(supabase, id))

  if (!building) {
    return <div className="text-sm text-muted-foreground">Building unavailable.</div>
  }

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">SSR: {building.name}</h1>
      <p className="text-sm text-muted-foreground">Timezone: {building.timezone}</p>
    </div>
  )
}
