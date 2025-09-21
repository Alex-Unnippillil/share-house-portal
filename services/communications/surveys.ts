import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { HttpError, throwIfSupabaseError } from './errors'
import {
  type CreateSurveyInput,
  type RequestContext,
  type SubmitSurveyResponseInput,
  type SurveyAggregationQuestion,
  type SurveyAggregationResult,
  type SurveyExportResult,
  type SurveyFilters,
  type SurveyRecord,
  type SurveyResponseRecord,
  type UpdateSurveyInput,
} from './types'
import { isAdmin, requireRole } from './auth'

function normalizeString(input: string | null | undefined) {
  return typeof input === 'string' ? input.trim() : null
}

function ensureSurveyVisibility(
  surveys: SurveyRecord[],
  context: RequestContext,
  filters: SurveyFilters,
): SurveyRecord[] {
  let result = surveys

  if (filters.status) {
    result = result.filter(survey => survey.status === filters.status)
  }

  if (filters.createdBy) {
    result = result.filter(survey => survey.created_by === filters.createdBy)
  }

  if (!isAdmin(context)) {
    result = result.filter(survey => {
      if (survey.created_by === context.userId) {
        return true
      }

      if (survey.status === 'open') {
        if (survey.closes_at) {
          return new Date(survey.closes_at).getTime() >= Date.now()
        }

        return true
      }

      if (filters.includeClosed) {
        return survey.status === 'closed'
      }

      return false
    })
  } else if (!filters.includeClosed) {
    result = result.filter(survey => survey.status !== 'archived')
  }

  return result
}

export async function listSurveys(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  filters: SurveyFilters = {},
): Promise<SurveyRecord[]> {
  const { data, error } = await supabase
    .from('communications_surveys')
    .select('*')
    .order('created_at', { ascending: false })

  throwIfSupabaseError(error, 'Failed to fetch surveys')

  const surveys = ensureSurveyVisibility(data ?? [], context, filters)

  return surveys
}

export async function createSurvey(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: CreateSurveyInput,
): Promise<SurveyRecord> {
  requireRole(context, ['admin'])

  const payload = {
    title: input.title.trim(),
    description: normalizeString(input.description),
    questions: input.questions,
    status: input.status ?? 'draft',
    created_by: context.userId,
    closes_at: input.closesAt ?? null,
    metadata: input.metadata ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('communications_surveys')
    .insert(payload)
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to create survey')

  if (!data) {
    throw new HttpError(500, 'Survey creation returned no data')
  }

  return data
}

export async function updateSurvey(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: UpdateSurveyInput,
): Promise<SurveyRecord> {
  requireRole(context, ['admin'])

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof input.title === 'string') {
    updates.title = input.title.trim()
  }

  if ('description' in input) {
    updates.description = normalizeString(input.description)
  }

  if ('status' in input && input.status) {
    updates.status = input.status
  }

  if ('questions' in input && input.questions) {
    updates.questions = input.questions
  }

  if ('closesAt' in input) {
    updates.closes_at = input.closesAt ?? null
  }

  if ('metadata' in input) {
    updates.metadata = input.metadata ?? null
  }

  const { data, error } = await supabase
    .from('communications_surveys')
    .update(updates)
    .eq('id', input.id)
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to update survey')

  if (!data) {
    throw new HttpError(404, 'Survey not found')
  }

  return data
}

export async function submitSurveyResponse(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: SubmitSurveyResponseInput,
): Promise<SurveyResponseRecord> {
  const { data: survey, error: surveyError } = await supabase
    .from('communications_surveys')
    .select('id, status, closes_at, created_by')
    .eq('id', input.surveyId)
    .maybeSingle()

  throwIfSupabaseError(surveyError, 'Failed to load survey')

  if (!survey) {
    throw new HttpError(404, 'Survey not found')
  }

  if (survey.status !== 'open') {
    throw new HttpError(400, 'Survey is not accepting responses')
  }

  if (survey.closes_at && new Date(survey.closes_at).getTime() < Date.now()) {
    throw new HttpError(400, 'Survey window has closed')
  }

  const { data, error } = await supabase
    .from('communications_survey_responses')
    .insert({
      survey_id: input.surveyId,
      respondent_id: context.userId,
      answers: input.answers,
      metadata: input.metadata ?? null,
    })
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to submit survey response')

  if (!data) {
    throw new HttpError(500, 'Survey response insert returned no data')
  }

  return data
}

function buildAggregation(
  survey: SurveyRecord,
  responses: SurveyResponseRecord[],
): SurveyAggregationResult {
  const questions: SurveyAggregationResult['questions'] = {}
  const respondentIds = new Set<string>()
  let lastResponseAt: string | null = null

  responses.forEach(response => {
    if (response.respondent_id) {
      respondentIds.add(response.respondent_id)
    }

    if (!lastResponseAt || response.submitted_at > lastResponseAt) {
      lastResponseAt = response.submitted_at
    }

    const answers = (response.answers ?? {}) as Record<string, unknown>

    Object.entries(answers).forEach(([questionId, value]) => {
      if (!questions[questionId]) {
        questions[questionId] = {
          totalResponses: 0,
          counts: {},
        }
      }

      const question = questions[questionId] as SurveyAggregationQuestion

      question.totalResponses += 1

      if (Array.isArray(value)) {
        value.forEach(item => {
          const key = String(item)
          question.counts[key] = (question.counts[key] ?? 0) + 1
        })
      } else if (typeof value === 'number') {
        const key = value.toString()
        question.counts[key] = (question.counts[key] ?? 0) + 1
        question.numericSum = (question.numericSum ?? 0) + value
      } else if (typeof value === 'boolean') {
        const key = value ? 'true' : 'false'
        question.counts[key] = (question.counts[key] ?? 0) + 1
      } else if (value !== null && value !== undefined) {
        const key = String(value)
        question.counts[key] = (question.counts[key] ?? 0) + 1
      }
    })
  })

  Object.values(questions).forEach(question => {
    if (question.numericSum !== undefined) {
      const average = question.numericSum / question.totalResponses
      question.numericAverage = Number(average.toFixed(4))
      question.numericSum = Number(question.numericSum.toFixed(4))
    }
  })

  return {
    survey,
    totalResponses: responses.length,
    respondents: respondentIds.size,
    lastResponseAt,
    questions,
  }
}

export async function aggregateSurveyResponses(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  surveyId: number,
): Promise<SurveyAggregationResult> {
  const { data: survey, error: surveyError } = await supabase
    .from('communications_surveys')
    .select('*')
    .eq('id', surveyId)
    .maybeSingle()

  throwIfSupabaseError(surveyError, 'Failed to load survey metadata')

  if (!survey) {
    throw new HttpError(404, 'Survey not found')
  }

  if (!isAdmin(context) && survey.created_by !== context.userId) {
    throw new HttpError(403, 'Only survey owners or admins can aggregate responses')
  }

  const { data: responses, error: responsesError } = await supabase
    .from('communications_survey_responses')
    .select('*')
    .eq('survey_id', surveyId)

  throwIfSupabaseError(responsesError, 'Failed to load survey responses')

  return buildAggregation(survey, responses ?? [])
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item)).join('; ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function formatCsv(rows: string[][]): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const needsQuotes = /[",\n]/.test(cell)
          const escaped = cell.replace(/"/g, '""')
          return needsQuotes ? `"${escaped}"` : escaped
        })
        .join(','),
    )
    .join('\n')
}

export async function exportSurveyResponses(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  surveyId: number,
): Promise<SurveyExportResult> {
  const aggregation = await aggregateSurveyResponses(supabase, context, surveyId)
  const { survey } = aggregation

  const { data: responses, error } = await supabase
    .from('communications_survey_responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: true })

  throwIfSupabaseError(error, 'Failed to load responses for export')

  const allKeys = new Set<string>()
  ;(responses ?? []).forEach(response => {
    const answers = (response.answers ?? {}) as Record<string, unknown>
    Object.keys(answers).forEach(key => allKeys.add(key))
  })

  const headers = ['response_id', 'respondent_id', 'submitted_at', ...allKeys]

  const rows = [headers]

  ;(responses ?? []).forEach(response => {
    const answers = (response.answers ?? {}) as Record<string, unknown>
    const row: string[] = [
      String(response.id),
      response.respondent_id ?? '',
      response.submitted_at,
    ]

    for (const key of allKeys) {
      row.push(toCsvValue(answers[key]))
    }

    rows.push(row)
  })

  const safeTitle = survey.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const filename = `${safeTitle || `survey-${surveyId}`}-responses.csv`
  const content = formatCsv(rows)

  return {
    filename,
    mimeType: 'text/csv',
    content,
  }
}
