'use client'

import { Suspense } from "react"
import { AlertCircle } from "lucide-react"
import { useQuery } from "@supabase-cache-helpers/postgrest-react-query"

import { Skeleton } from "@/components/ui/skeleton"
import { getCountryById } from "@/queries/country-by-id"
import useSupabaseBrowser from "@/utils/supabase-browser"

export default function CountryPage({ params }: { params: { id: string } }) {
  const countryId = Number(params.id)

  return (
    <Suspense fallback={<CountryDetailsSkeleton />}>
      <CountryDetails id={countryId} />
    </Suspense>
  )
}

function CountryDetails({ id }: { id: number }) {
  const supabase = useSupabaseBrowser()
  const { data: country, error } = useQuery(getCountryById(supabase, id), {
    suspense: true,
  })

  if (error || !country) {
    return (
      <div className="flex max-w-xl items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Unable to load country</p>
          <p className="text-sm text-destructive/80">
            We couldn&apos;t fetch the latest country details. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-6">
      <h1 className="text-2xl font-semibold">{country.name}</h1>
    </div>
  )
}

export function CountryDetailsSkeleton() {
  return (
    <div
      className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-6"
      role="status"
      aria-live="polite"
    >
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <span className="sr-only">Loading country details…</span>
    </div>
  )
}