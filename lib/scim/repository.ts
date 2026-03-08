import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"
import { ScimError } from "./errors"
import type {
  NormalizedScimUser,
  ProfileInsert,
  ProfileUpdate,
} from "./types"

const PROFILES_TABLE = "profiles"

export async function listProfiles(
  client: SupabaseClient<Database>,
  {
    offset,
    limit,
    filter,
  }: {
    offset: number
    limit: number
    filter?: { field: "id" | "userName"; value: string }
  }
) {
  const baseQuery = client
    .from(PROFILES_TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: true })

  let query = baseQuery

  if (filter) {
    if (filter.field === "id") {
      query = query.eq("id", filter.value)
    } else if (filter.field === "userName") {
      query = query.eq("email", filter.value)
    }
  }

  const boundedLimit = limit > 0 ? limit : 1
  const rangeEnd = offset + boundedLimit - 1
  const { data, error, count } = await query.range(offset, rangeEnd)

  if (error) {
    throw new ScimError(500, error.message)
  }

  const rows = (data ?? []).slice(0, Math.max(0, limit))

  return {
    rows,
    total: typeof count === "number" ? count : rows.length,
  }
}

export async function getProfileById(
  client: SupabaseClient<Database>,
  id: string
) {
  const { data, error } = await client
    .from(PROFILES_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new ScimError(500, error.message)
  }

  return data ?? null
}

export async function createProfile(
  client: SupabaseClient<Database>,
  payload: ProfileInsert
) {
  const { data, error } = await client
    .from(PROFILES_TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new ScimError(500, error.message)
  }

  return data
}

export async function updateProfile(
  client: SupabaseClient<Database>,
  id: string,
  payload: ProfileUpdate
) {
  const { data, error } = await client
    .from(PROFILES_TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new ScimError(500, error.message)
  }

  return data
}

export async function deleteProfile(
  client: SupabaseClient<Database>,
  id: string
) {
  const { error } = await client.from(PROFILES_TABLE).delete().eq("id", id)

  if (error) {
    throw new ScimError(500, error.message)
  }
}

export function buildProfilePayload(
  normalized: NormalizedScimUser
): ProfileInsert {
  const metadata = { ...normalized.metadata }
  const existingScim =
    (metadata["scim"] as Record<string, unknown> | null | undefined) ?? {}
  const scimMetadata = {
    ...existingScim,
    active: normalized.active,
    externalId: normalized.externalId,
  }

  return {
    email: normalized.email,
    username: normalized.userName,
    full_name: normalized.fullName,
    role: normalized.role,
    metadata: { ...metadata, scim: scimMetadata },
  }
}

export function buildProfileUpdate(
  normalized: NormalizedScimUser
): ProfileUpdate {
  return buildProfilePayload(normalized)
}
