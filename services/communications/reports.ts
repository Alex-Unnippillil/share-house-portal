import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { throwIfSupabaseError } from './errors'
import { requireRole } from './auth'
import type { CommunicationsReport, RequestContext } from './types'

function buildCountMap<T extends string | number | null | undefined>(
  values: T[] | null,
): Partial<Record<Exclude<T, null | undefined>, number>> {
  const counts: Partial<Record<Exclude<T, null | undefined>, number>> = {}

  for (const value of values ?? []) {
    if (value === null || value === undefined) continue
    const key = value as Exclude<T, null | undefined>
    counts[key] = (counts[key] ?? 0) + 1
  }

  return counts
}

export async function buildCommunicationsReport(
  supabase: TypedSupabaseClient,
  context: RequestContext,
): Promise<CommunicationsReport> {
  requireRole(context, ['admin'])

  const [announcementsRes, bulletinsRes, abuseRes, surveysRes, responsesRes] =
    await Promise.all([
      supabase.from('communications_announcements').select('status'),
      supabase
        .from('communications_bulletins')
        .select('status, moderation_status'),
      supabase.from('communications_abuse_reports').select('status'),
      supabase.from('communications_surveys').select('id, status'),
      supabase.from('communications_survey_responses').select('survey_id'),
    ])

  throwIfSupabaseError(
    announcementsRes.error,
    'Failed to load announcement reporting data',
  )
  throwIfSupabaseError(
    bulletinsRes.error,
    'Failed to load bulletin reporting data',
  )
  throwIfSupabaseError(abuseRes.error, 'Failed to load abuse reporting data')
  throwIfSupabaseError(surveysRes.error, 'Failed to load survey reporting data')
  throwIfSupabaseError(
    responsesRes.error,
    'Failed to load survey response reporting data',
  )

  const announcementCounts = buildCountMap(
    (announcementsRes.data ?? []).map(item => item.status),
  )
  const bulletinStatusCounts = buildCountMap(
    (bulletinsRes.data ?? []).map(item => item.status),
  )
  const bulletinModerationCounts = buildCountMap(
    (bulletinsRes.data ?? []).map(item => item.moderation_status),
  )
  const abuseByStatus = buildCountMap(
    (abuseRes.data ?? []).map(item => item.status),
  ) as CommunicationsReport['abuseByStatus']
  const surveyStatusCounts = buildCountMap(
    (surveysRes.data ?? []).map(item => item.status),
  )

  const responseCounts = (responsesRes.data ?? []).reduce(
    (acc, response) => {
      acc[response.survey_id] = (acc[response.survey_id] ?? 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )

  const totalAnnouncements = announcementsRes.data?.length ?? 0
  const totalSurveys = surveysRes.data?.length ?? 0

  return {
    announcementCounts: {
      total: totalAnnouncements,
      ...announcementCounts,
    },
    bulletinStatusCounts,
    bulletinModerationCounts,
    abuseByStatus: {
      open: abuseByStatus.open ?? 0,
      ...abuseByStatus,
    },
    surveySummary: {
      total: totalSurveys,
      statusBreakdown: surveyStatusCounts,
      responseCounts,
    },
  }
}
