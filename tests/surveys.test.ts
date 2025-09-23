import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  readUserSessionMock,
  revalidatePathMock,
  upsertMock,
  insertMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  readUserSessionMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  upsertMock: vi.fn(),
  insertMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/utils/actions', () => ({
  readUserSession: readUserSessionMock,
}))

vi.mock('@/utils/supaone', () => ({
  createSupbaseServerClient: createClientMock,
}))

import { recordCsatResponse, submitNpsResponse } from '@/app/feedback/actions'
import {
  compareSurveyPeriods,
  getCurrentNpsPeriod,
  getQuarterInfo,
  isNpsSurveyDue,
} from '@/lib/surveys'

describe('survey scheduling helpers', () => {
  it('computes quarter metadata deterministically', () => {
    const info = getQuarterInfo(new Date('2025-05-10T12:00:00Z'))
    expect(info.period).toBe('2025-Q2')
    expect(info.label).toBe('Q2 2025')
    expect(info.start.toISOString()).toBe('2025-04-01T00:00:00.000Z')
    expect(info.end.toISOString()).toBe('2025-06-30T23:59:59.999Z')
  })

  it('identifies when a new quarterly NPS survey is due', () => {
    expect(isNpsSurveyDue(null, new Date('2025-01-15T00:00:00Z'))).toBe(true)
    expect(isNpsSurveyDue('2025-Q1', new Date('2025-02-10T00:00:00Z'))).toBe(false)
    expect(isNpsSurveyDue('2024-Q4', new Date('2025-02-10T00:00:00Z'))).toBe(true)
  })

  it('compares survey periods chronologically', () => {
    expect(compareSurveyPeriods('2024-Q4', '2025-Q1')).toBeLessThan(0)
    expect(compareSurveyPeriods('2025-Q2', '2025-Q1')).toBeGreaterThan(0)
    expect(compareSurveyPeriods('2025-Q3', '2025-Q3')).toBe(0)
  })

  it('derives the current period from the provided date', () => {
    expect(getCurrentNpsPeriod(new Date('2025-11-01T00:00:00Z'))).toBe('2025-Q4')
  })
})

describe('survey actions', () => {
  let csatSingleMock: ReturnType<typeof vi.fn>
  let csatSelectMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    upsertMock.mockResolvedValue({ data: null, error: null })
    csatSingleMock = vi.fn(async () => ({ data: { id: 'csat-1' }, error: null }))
    csatSelectMock = vi.fn(() => ({ single: csatSingleMock }))
    insertMock.mockReturnValue({ select: csatSelectMock })

    createClientMock.mockResolvedValue({
      from: (table: string) => {
        if (table === 'nps_responses') {
          return { upsert: upsertMock }
        }
        if (table === 'csat_responses') {
          return { insert: insertMock }
        }
        throw new Error(`Unexpected table access: ${table}`)
      },
    })

    readUserSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('persists NPS responses and revalidates the dashboard view', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-02-10T12:00:00Z'))

    const result = await submitNpsResponse({ score: 9, comment: 'Love the new updates' })

    expect(result).toEqual({ success: true, surveyPeriod: '2025-Q1' })
    expect(upsertMock).toHaveBeenCalledWith(
      {
        user_id: 'user-123',
        score: 9,
        comment: 'Love the new updates',
        survey_period: '2025-Q1',
      },
      { onConflict: 'user_id,survey_period' },
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard')
  })

  it('records CSAT responses with optional comments', async () => {
    const result = await recordCsatResponse({
      flow: 'maintenance_request',
      rating: 5,
      comment: 'Super fast turnaround!',
    })

    expect(result).toEqual({ success: true, responseId: 'csat-1' })
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-123',
      flow: 'maintenance_request',
      rating: 5,
      comment: 'Super fast turnaround!',
    })
    expect(csatSelectMock).toHaveBeenCalledWith('id')
    expect(csatSingleMock).toHaveBeenCalled()
  })
})
