import { DEFAULT_QUIET_HOURS } from "@/lib/quiet-hours"
import type { Tables } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export type ProfileWithHousehold = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "household_id"
>

export async function ensureProfileHousehold(
  client: TypedSupabaseClient,
  userId: string
): Promise<{ profile: ProfileWithHousehold; householdId: string }> {
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, full_name, household_id")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    throw new Error("Unable to load profile for the current user.")
  }

  if (profile.household_id) {
    return { profile, householdId: profile.household_id }
  }

  const householdName = profile.full_name
    ? `${profile.full_name}'s Household`
    : "Shared Household"

  const { data: household, error: householdError } = await client
    .from("households")
    .insert({ name: householdName, created_by: profile.id })
    .select("id")
    .single()

  if (householdError || !household) {
    throw new Error("Unable to create a household for the current user.")
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({ household_id: household.id })
    .eq("id", profile.id)

  if (updateError) {
    throw new Error("Unable to link the profile to the household.")
  }

  return { profile: { ...profile, household_id: household.id }, householdId: household.id }
}

export async function ensureHouseholdQuietHours(
  client: TypedSupabaseClient,
  householdId: string
): Promise<Tables<"household_settings">> {
  const { data, error } = await client
    .from("household_settings")
    .select("*")
    .eq("household_id", householdId)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to load quiet hours configuration.")
  }

  if (data) {
    return data
  }

  const { data: inserted, error: insertError } = await client
    .from("household_settings")
    .insert({
      household_id: householdId,
      quiet_hours_start: DEFAULT_QUIET_HOURS.quiet_hours_start,
      quiet_hours_end: DEFAULT_QUIET_HOURS.quiet_hours_end,
      timezone: DEFAULT_QUIET_HOURS.timezone,
      policy_message: DEFAULT_QUIET_HOURS.policy_message,
    })
    .select("*")
    .single()

  if (insertError || !inserted) {
    throw new Error("Unable to create default quiet hours settings for the household.")
  }

  return inserted
}
