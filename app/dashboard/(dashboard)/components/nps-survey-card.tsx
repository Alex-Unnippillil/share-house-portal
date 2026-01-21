import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"
import { getQuarterDateRange, getQuarterInfo, isNpsSurveyDue } from "@/lib/surveys"
import { readUserSession } from "@/utils/actions"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

import { NpsSurveyForm } from "./nps-survey-form"

export default async function NpsSurveyCard() {
  const [{ data: sessionData }, supabaseClient] = await Promise.all([
    readUserSession(),
    createSupbaseServerClientReadOnly(),
  ])

  const userId = sessionData.session?.user.id
  if (!userId) {
    return null
  }

  const supabase = supabaseClient as SupabaseClient<Database>

  const { data: responses, error } = await supabase
    .from('nps_responses')
    .select('survey_period')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Unable to load NPS responses', error)
    return null
  }

  const latestPeriod = responses?.[0]?.survey_period ?? null
  if (!isNpsSurveyDue(latestPeriod)) {
    return null
  }

  const quarterInfo = getQuarterInfo()
  const range = getQuarterDateRange()

  return (
    <NpsSurveyForm
      period={quarterInfo.period}
      periodLabel={quarterInfo.label}
      window={range}
    />
  )
}
