import type { Metadata } from "next"

import { HouseRulesHistory } from "@/components/house-rules/history-list"
import { getHouseRulesHistory } from "@/queries/house-rules"
import { createSupbaseServerClient } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "House rules",
  description: "Review the latest community guidelines and revisit previous versions for your shared home.",
}

export default async function HouseRulesPage() {
  const supabase = await createSupbaseServerClient()
  const { data: history, error } = await getHouseRulesHistory(supabase)

  if (error) {
    console.error("Failed to load house rules history", error)
  }

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">House rules</h1>
        <p className="text-muted-foreground">
          Stay aligned on quiet hours, guest policies, and shared responsibilities. New versions appear instantly for every
          roommate.
        </p>
      </div>
      <HouseRulesHistory initialRules={history ?? []} />
    </div>
  )
}
