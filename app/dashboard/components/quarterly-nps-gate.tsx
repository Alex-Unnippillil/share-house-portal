import { cookies } from "next/headers"

import { QuarterlyNpsSurvey } from "@/components/surveys/quarterly-nps-survey"
import { fetchLatestNpsResponse, type NpsResponseSummary } from "@/lib/data/surveys"
import { getQuarterWindow, shouldTriggerQuarterlyNps } from "@/lib/surveys"
import { createClient } from "@/utils/supa-server-actions"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export async function QuarterlyNpsGate() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  let latestResponse: NpsResponseSummary | null = null

  try {
    latestResponse = await fetchLatestNpsResponse(
      supabase as unknown as TypedSupabaseClient,
      user.id
    )
  } catch (error) {
    console.error("Failed to load latest NPS response", error)
  }

  if (!shouldTriggerQuarterlyNps(latestResponse?.quarter_start ?? null)) {
    return null
  }

  const quarter = getQuarterWindow()

  return (
    <QuarterlyNpsSurvey
      quarter={quarter}
      lastCompletedQuarterStart={latestResponse?.quarter_start ?? null}
      className="border border-dashed"
    />
  )
}
