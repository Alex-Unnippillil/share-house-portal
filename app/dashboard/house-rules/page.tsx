import { HouseRulesAdminPanel } from "./house-rules-admin-panel"

import { getHouseRulesHistory } from "@/queries/house-rules"
import { createSupbaseServerClient } from "@/utils/supaone"

export const dynamic = "force-dynamic"

export default async function DashboardHouseRulesPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profilePromise = user
    ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [{ data: history, error: historyError }, { data: profile, error: profileError }] = await Promise.all([
    getHouseRulesHistory(supabase),
    profilePromise,
  ])

  if (historyError) {
    console.error("Failed to load house rules history", historyError)
  }

  if (profileError) {
    console.error("Failed to resolve profile while loading house rules", profileError)
  }

  const canPublish = Boolean(profile?.role && ["admin", "property_manager"].includes(profile.role))

  return <HouseRulesAdminPanel initialRules={history ?? []} canPublish={canPublish} />
}
