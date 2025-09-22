import { redirect } from "next/navigation"

import type { Database } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

import PurchaseEntryForm from "./purchase-entry-form"

type HouseholdMemberRow =
  Database["public"]["Tables"]["household_members"]["Row"] & {
    profile: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "username"> | null
  }

type HouseholdRow = Database["public"]["Tables"]["households"]["Row"] & {
  household_members: HouseholdMemberRow[] | null
}

export default async function SupplyPurchasesPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect("/auth")
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("profile_id", user.id)

  if (membershipError) {
    console.error("supply purchases memberships", membershipError)
    throw new Error("Unable to load household memberships")
  }

  const householdIds = Array.from(
    new Set(membershipRows?.map((row) => row.household_id) ?? []),
  )

  let households: HouseholdRow[] = []
  if (householdIds.length) {
    const { data: householdsData, error: householdsError } = await supabase
      .from("households")
      .select(
        `
          id,
          name,
          household_members (
            profile_id,
            default_supply_split,
            profile:profiles (
              full_name,
              username
            )
          )
        `,
      )
      .in("id", householdIds)

    if (householdsError) {
      console.error("supply purchases households", householdsError)
      throw new Error("Unable to load household information")
    }

    households = (householdsData ?? []) as HouseholdRow[]
  }

  const formattedHouseholds = households
    .map((household) => ({
      id: household.id,
      name: household.name,
      members:
        household.household_members?.map((member) => ({
          profile_id: member.profile_id,
          default_supply_split: member.default_supply_split,
          profile: member.profile ?? null,
        })) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return <PurchaseEntryForm households={formattedHouseholds} userId={user.id} />
}
