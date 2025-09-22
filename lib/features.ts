import { cookies, headers } from "next/headers"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createSupbaseServerClient } from "@/utils/supaone"

export const FEATURE_DEFINITIONS = [
  {
    key: "rent_payments",
    label: "Rent payments",
    description:
      "Controls access to Stripe-powered autopay, payment history, and rent ledger workflows.",
    defaultEnabled: true,
  },
  {
    key: "amenity_bookings",
    label: "Amenity bookings",
    description:
      "Enables Cal.com scheduling, conflict detection, and shared amenity calendars for each property.",
    defaultEnabled: true,
  },
  {
    key: "documents",
    label: "Documents & leases",
    description:
      "Gates Documenso-powered lease management, document storage, and audit trail exports.",
    defaultEnabled: true,
  },
  {
    key: "messaging",
    label: "Household messaging",
    description:
      "Turns on realtime threads, reactions, polls, and moderation tooling for the roommate feed.",
    defaultEnabled: true,
  },
  {
    key: "feature_management",
    label: "Feature management",
    description:
      "Allow property managers to view and toggle feature availability for each household.",
    defaultEnabled: true,
  },
] as const

export type FeatureDefinition = (typeof FEATURE_DEFINITIONS)[number]
export type FeatureKey = FeatureDefinition["key"]
export type FeatureFlags = Record<string, boolean>
export type FeatureFlagSource = "database" | "defaults"

export interface FeatureToggleInput {
  householdId: string
  key: FeatureKey
  enabled: boolean
}

export class MissingHouseholdError extends Error {
  constructor(message = "A household id is required to resolve feature flags.") {
    super(message)
    this.name = "MissingHouseholdError"
  }
}

export class FeatureFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FeatureFetchError"
  }
}

type FeatureRow = { key: string; enabled: boolean }

const featureDefaultMap: Record<FeatureKey, boolean> = FEATURE_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition.defaultEnabled
    return acc
  },
  {} as Record<FeatureKey, boolean>
)

async function fetchAllFlags(householdId: string) {
  const supabase = await createSupbaseServerClient()
  return fetchFlagRows(supabase, householdId)
}

export function resolveHouseholdId(candidate?: string | null): string | null {
  if (candidate) {
    return candidate
  }

  try {
    const headerStore = headers()
    const headerValue = headerStore.get("x-household-id")
    if (headerValue) {
      return headerValue
    }
  } catch (error) {
    // Ignored – headers() can throw outside of a request context.
  }

  try {
    const cookieStore = cookies()
    const cookieValue = cookieStore.get("household_id")?.value
    if (cookieValue) {
      return cookieValue
    }
  } catch (error) {
    // Ignored – cookies() can throw outside of a request context.
  }

  return null
}

export async function getFeatureFlags({
  householdId,
  keys,
  strict = false,
  supabase,
}: {
  householdId?: string | null
  keys?: FeatureKey[]
  strict?: boolean
  supabase?: TypedSupabaseClient
} = {}): Promise<{
  householdId: string | null
  flags: FeatureFlags
  source: FeatureFlagSource
}> {
  const resolvedHouseholdId = resolveHouseholdId(householdId)

  if (!resolvedHouseholdId) {
    if (strict) {
      throw new MissingHouseholdError()
    }
    return {
      householdId: null,
      flags: buildDefaultFlags(keys),
      source: "defaults",
    }
  }

  let rows: FeatureRow[]
  if (supabase) {
    rows = await fetchFlagRows(supabase, resolvedHouseholdId, keys)
  } else if (keys && keys.length > 0) {
    const client = await createSupbaseServerClient()
    rows = await fetchFlagRows(client, resolvedHouseholdId, keys)
  } else {
    rows = await fetchAllFlags(resolvedHouseholdId)
  }

  return {
    householdId: resolvedHouseholdId,
    flags: mergeFlags(rows, keys),
    source: "database",
  }
}

export function getDefaultFeatureFlag(key: FeatureKey): boolean {
  return featureDefaultMap[key]
}

export async function ensureFeatureEnabled({
  fallbackToDefault = false,
  householdId,
  key,
  strict,
  supabase,
}: {
  fallbackToDefault?: boolean
  householdId?: string | null
  key: FeatureKey
  strict?: boolean
  supabase?: TypedSupabaseClient
}): Promise<{
  enabled: boolean
  flags: FeatureFlags
  householdId: string | null
  source: FeatureFlagSource
}> {
  const { flags, householdId: resolvedHouseholdId, source } = await getFeatureFlags({
    householdId,
    keys: [key],
    strict,
    supabase,
  })

  const flagValue = flags[key]

  if (typeof flagValue === "boolean") {
    return { enabled: flagValue, flags, householdId: resolvedHouseholdId, source }
  }

  if (fallbackToDefault) {
    return {
      enabled: featureDefaultMap[key] ?? false,
      flags,
      householdId: resolvedHouseholdId,
      source,
    }
  }

  return { enabled: false, flags, householdId: resolvedHouseholdId, source }
}

function buildDefaultFlags(keys?: FeatureKey[]): FeatureFlags {
  if (!keys || keys.length === 0) {
    return { ...featureDefaultMap }
  }

  return keys.reduce<FeatureFlags>((acc, key) => {
    acc[key] = featureDefaultMap[key] ?? false
    return acc
  }, {})
}

function mergeFlags(rows: FeatureRow[], keys?: FeatureKey[]): FeatureFlags {
  const flags = buildDefaultFlags(keys)

  for (const row of rows) {
    flags[row.key] = row.enabled
  }

  return flags
}

async function fetchFlagRows(
  client: TypedSupabaseClient,
  householdId: string,
  keys?: readonly FeatureKey[]
): Promise<FeatureRow[]> {
  let query = client.from("features").select("key, enabled").eq("household_id", householdId)

  if (keys && keys.length > 0) {
    query = query.in("key", keys as string[])
  }

  const { data, error } = await query

  if (error) {
    throw new FeatureFetchError(error.message)
  }

  return data ?? []
}
