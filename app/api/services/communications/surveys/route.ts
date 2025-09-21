import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supa-server-actions'
import {
  aggregateSurveyResponses,
  createSurvey,
  exportSurveyResponses,
  getRequestContext,
  listSurveys,
  normalizeError,
  submitSurveyResponse,
  updateSurvey,
  type CreateSurveyInput,
  type SubmitSurveyResponseInput,
  type SurveyStatus,
  type UpdateSurveyInput,
} from '@/services/communications'

const SURVEY_STATUSES: SurveyStatus[] = [
  'draft',
  'open',
  'closed',
  'archived',
]

function toErrorResponse(error: unknown) {
  const normalized = normalizeError(error)

  return NextResponse.json(
    { error: normalized.message, details: normalized.details },
    { status: normalized.status },
  )
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const { searchParams } = new URL(request.url)

    const statusParam = searchParams.get('status')
    let status: SurveyStatus | undefined

    if (statusParam) {
      if (!SURVEY_STATUSES.includes(statusParam as SurveyStatus)) {
        return NextResponse.json(
          { error: 'Invalid survey status filter' },
          { status: 400 },
        )
      }

      status = statusParam as SurveyStatus
    }

    const includeClosed = searchParams.get('includeClosed') === 'true'
    const createdBy = searchParams.get('createdBy') ?? undefined
    const surveyIdParam = searchParams.get('surveyId')
    const aggregate = searchParams.get('aggregate') === 'true'
    const format = searchParams.get('format')

    if ((aggregate || format === 'csv') && !surveyIdParam) {
      return NextResponse.json(
        { error: 'A surveyId is required for aggregation or export' },
        { status: 400 },
      )
    }

    if (surveyIdParam) {
      const surveyId = Number.parseInt(surveyIdParam, 10)

      if (Number.isNaN(surveyId)) {
        return NextResponse.json(
          { error: 'surveyId must be numeric' },
          { status: 400 },
        )
      }

      if (aggregate) {
        const aggregation = await aggregateSurveyResponses(
          supabase,
          context,
          surveyId,
        )

        return NextResponse.json({ data: aggregation })
      }

      if (format === 'csv') {
        const exportResult = await exportSurveyResponses(
          supabase,
          context,
          surveyId,
        )

        return new NextResponse(exportResult.content, {
          status: 200,
          headers: {
            'Content-Type': exportResult.mimeType,
            'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
          },
        })
      }
    }

    const surveys = await listSurveys(supabase, context, {
      status,
      includeClosed,
      createdBy,
    })

    if (surveyIdParam) {
      const surveyId = Number.parseInt(surveyIdParam, 10)
      if (!Number.isNaN(surveyId)) {
        return NextResponse.json({
          data: surveys.filter(survey => survey.id === surveyId),
        })
      }
    }

    return NextResponse.json({ data: surveys })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as CreateSurveyInput

    if (!body?.title || typeof body.questions !== 'object') {
      return NextResponse.json(
        { error: 'Survey title and questions are required' },
        { status: 400 },
      )
    }

    if (body.status && !SURVEY_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid survey status' },
        { status: 400 },
      )
    }
 
    const survey = await createSurvey(supabase, context, body)

    return NextResponse.json({ data: survey }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as SubmitSurveyResponseInput

    if (!body?.surveyId || typeof body.answers !== 'object') {
      return NextResponse.json(
        { error: 'Survey id and answers are required' },
        { status: 400 },
      )
    }

    const response = await submitSurveyResponse(supabase, context, body)

    return NextResponse.json({ data: response }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const body = (await request.json()) as UpdateSurveyInput

    if (!body?.id) {
      return NextResponse.json(
        { error: 'Survey id is required' },
        { status: 400 },
      )
    }

    if (body.status && !SURVEY_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid survey status' },
        { status: 400 },
      )
    }

    const survey = await updateSurvey(supabase, context, body)

    return NextResponse.json({ data: survey })
  } catch (error) {
    return toErrorResponse(error)
  }
}
