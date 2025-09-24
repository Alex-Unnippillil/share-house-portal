import DataLoader from "dataloader"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supabase/server"

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export type GraphQLContext = {
  supabase: SupabaseClient<Database>
  loaders: {
    profileById: DataLoader<string, ProfileRow | null>
  }
}

async function batchProfiles(
  supabase: SupabaseClient<Database>,
  keys: readonly string[]
) {
  if (keys.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .in("id", keys as string[])

  if (error) {
    throw new Error(`Failed to load profiles: ${error.message}`)
  }

  const profileMap = new Map<string, ProfileRow>()
  for (const profile of data ?? []) {
    if (profile?.id) {
      profileMap.set(profile.id, profile as ProfileRow)
    }
  }

  return keys.map((key) => profileMap.get(key) ?? null)
}

export function createGraphQLContext(
  client?: SupabaseClient<Database>
): GraphQLContext {
  const supabase = (client ?? (createClient() as SupabaseClient<Database>))

  return {
    supabase,
    loaders: {
      profileById: new DataLoader<string, ProfileRow | null>((keys) =>
        batchProfiles(supabase, keys)
      ),
    },
  }
}
