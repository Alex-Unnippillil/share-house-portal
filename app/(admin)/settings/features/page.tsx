import type { Metadata } from "next"

import {
  FEATURE_DEFINITIONS,
  type FeatureKey,
  getFeatureFlags,
} from "@/lib/features"

import FeatureToggleList from "./feature-toggle-list"

export const metadata: Metadata = {
  title: "Feature flags",
}

interface FeatureSettingsPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function FeatureSettingsPage({
  searchParams,
}: FeatureSettingsPageProps) {
  const searchParamHousehold = getHouseholdFromSearchParams(searchParams)
  const featureKeys = FEATURE_DEFINITIONS.map((definition) => definition.key) as FeatureKey[]
  const { flags, householdId } = await getFeatureFlags({
    householdId: searchParamHousehold,
    keys: featureKeys,
  })

  const header = (
    <header className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Feature flags</h1>
      <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
        Toggle payments, bookings, documents, and messaging workflows at the household level
        to coordinate gradual rollouts and staged pilots.
      </p>
    </header>
  )

  if (!householdId) {
    return (
      <div className="container max-w-4xl space-y-6 py-10">
        {header}
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6">
          <h2 className="text-lg font-semibold">Select a household</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Provide a household id via the <code className="rounded bg-muted px-1 py-0.5">?household=&lt;uuid&gt;</code> search
            parameter or by setting a <code className="rounded bg-muted px-1 py-0.5">household_id</code> cookie to manage feature
            availability.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once supplied, toggles update instantly without requiring a redeploy or page refresh.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      {header}
      <FeatureToggleList
        definitions={FEATURE_DEFINITIONS}
        householdId={householdId}
        initialFlags={flags}
      />
    </div>
  )
}

function getHouseholdFromSearchParams(
  searchParams?: Record<string, string | string[] | undefined>
): string | undefined {
  if (!searchParams) {
    return undefined
  }

  const value = searchParams.household
  if (typeof value === "string" && value.length > 0) {
    return value
  }

  if (Array.isArray(value)) {
    return value.at(-1) ?? undefined
  }

  return undefined
}
