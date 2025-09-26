"use client"

import { CountryDetailSkeleton } from "@/app/countries/_components/country-detail-skeleton"
import useSupabaseBrowser from "@/utils/supabase-browser"
import { getCountryById } from "@/queries/country-by-id"
import { useQuery } from "@supabase-cache-helpers/postgrest-react-query"

export default function Country({ id }: { id: number }) {
  const supabase = useSupabaseBrowser()
  const {
    data: country,
    isLoading,
    isError,
  } = useQuery(getCountryById(supabase, id))

  if (isLoading) {
    return <CountryDetailSkeleton />
  }

  if (isError || !country) {
    return (
      <div role="alert" aria-live="assertive" className="text-destructive">
        Unable to load country details.
      </div>
    )
  }

  return (
    <section aria-busy="false" className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">SSR: {country.name}</h1>
        <p className="text-muted-foreground">Country identifier: {id}</p>
      </div>
    </section>
  )
}
