import type { Database } from '@/lib/supabase'

export type AnnouncementStatus = Database['public']['Enums']['announcement_status']
export type BulletinStatus = Database['public']['Enums']['bulletin_status']
export type ModerationStatus = Database['public']['Enums']['moderation_status']
export type AbuseStatus = Database['public']['Enums']['abuse_status']
export type SurveyStatus = Database['public']['Enums']['survey_status']
export type ModerationAction = Database['public']['Enums']['moderation_action']

export type AnnouncementRecord = Database['public']['Tables']['communications_announcements']['Row']
export type BulletinRecord = Database['public']['Tables']['communications_bulletins']['Row']
export type AbuseReportRecord = Database['public']['Tables']['communications_abuse_reports']['Row']
export type SurveyRecord = Database['public']['Tables']['communications_surveys']['Row']
export type SurveyResponseRecord = Database['public']['Tables']['communications_survey_responses']['Row']

export interface AnnouncementFilters {
  status?: AnnouncementStatus
  includeExpired?: boolean
  limit?: number
}

export interface BulletinFilters {
  status?: BulletinStatus
  moderationStatus?: ModerationStatus
  mineOnly?: boolean
  includeAbuse?: boolean
}

export type BulletinWithRelations = BulletinRecord & {
  abuseReports?: AbuseReportRecord[]
}

export interface BulletinListResult {
  bulletins: BulletinWithRelations[]
  abuseSummary?: Record<number, Partial<Record<AbuseStatus, number>>>
}

export interface SurveyFilters {
  status?: SurveyStatus
  includeClosed?: boolean
  createdBy?: string
}

export interface RequestContext {
  userId: string
  role: 'admin' | 'user' | string
  email?: string | null
}

export interface SurveyAggregationQuestion {
  totalResponses: number
  counts: Record<string, number>
  numericAverage?: number
  numericSum?: number
}

export interface SurveyAggregationResult {
  survey: SurveyRecord
  totalResponses: number
  respondents: number
  lastResponseAt: string | null
  questions: Record<string, SurveyAggregationQuestion>
}

export interface SurveyExportResult {
  filename: string
  mimeType: string
  content: string
}

export interface CreateAnnouncementInput {
  title: string
  body: string
  status?: AnnouncementStatus
  publishAt?: string | null
  expireAt?: string | null
  targetRoles?: string[] | null
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
  id: number
}

export interface CreateBulletinInput {
  title: string
  content: string
}

export interface ModerateBulletinInput {
  bulletinId: number
  action: Exclude<ModerationAction, 'submit' | 'flag'>
  notes?: string
  resolutionNotes?: string
}

export interface ReportAbuseInput {
  bulletinId: number
  reason: string
  details?: string
}

export interface CreateSurveyInput {
  title: string
  description?: string | null
  questions: Record<string, unknown>
  status?: SurveyStatus
  closesAt?: string | null
  metadata?: Record<string, unknown> | null
}

export interface UpdateSurveyInput extends Partial<CreateSurveyInput> {
  id: number
}

export interface SubmitSurveyResponseInput {
  surveyId: number
  answers: Record<string, unknown>
  metadata?: Record<string, unknown> | null
}

export interface CommunicationsReport {
  announcementCounts: Partial<Record<AnnouncementStatus, number>> & {
    total: number
  }
  bulletinStatusCounts: Partial<Record<BulletinStatus, number>>
  bulletinModerationCounts: Partial<Record<ModerationStatus, number>>
  abuseByStatus: Partial<Record<AbuseStatus, number>> & {
    open: number
  }
  surveySummary: {
    total: number
    statusBreakdown: Partial<Record<SurveyStatus, number>>
    responseCounts: Record<number, number>
  }
}
