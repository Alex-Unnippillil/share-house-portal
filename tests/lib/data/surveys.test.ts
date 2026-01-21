import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchLatestNpsResponse,
  hasSubmittedNpsThisQuarter,
  recordCsatResponse,
  recordNpsResponse,
} from '@/lib/data/surveys'
import { getQuarterWindow } from '@/lib/surveys'

type MaybeSingleResult<T> = { data: T; error: { message: string } | null }

type NpsBuilder = {
  select?: ReturnType<typeof vi.fn>
  eq?: ReturnType<typeof vi.fn>
  order?: ReturnType<typeof vi.fn>
  limit?: ReturnType<typeof vi.fn>
  maybeSingle?: () => Promise<MaybeSingleResult<unknown>>
  insert?: ReturnType<typeof vi.fn>
}

type CsatBuilder = {
  insert: ReturnType<typeof vi.fn>
}

function createNpsBuilder(options: {
  selectResult?: MaybeSingleResult<unknown>
  insertError?: { message: string } | null
} = {}): NpsBuilder {
  const builder: Partial<NpsBuilder> = {}

  if (options.selectResult) {
    builder.select = vi.fn().mockImplementation(() => builder)
    builder.eq = vi.fn().mockImplementation(() => builder)
    builder.order = vi.fn().mockImplementation(() => builder)
    builder.limit = vi.fn().mockImplementation(() => builder)
    builder.maybeSingle = vi.fn().mockResolvedValue(options.selectResult)
  }

  if (options.insertError !== undefined) {
    builder.insert = vi.fn().mockResolvedValue({ data: null, error: options.insertError })
  }

  return builder as NpsBuilder
}

function createCsatBuilder(error: { message: string } | null = null): CsatBuilder {
  return {
    insert: vi.fn().mockResolvedValue({ data: null, error }),
  }
}

function createSurveySupabaseStub({
  nps,
  csat,
}: {
  nps?: NpsBuilder
  csat?: CsatBuilder
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'nps_responses') {
        if (!nps) {
          throw new Error('NPS builder not provided')
        }
        return nps
      }

      if (table === 'csat_responses') {
        if (!csat) {
          throw new Error('CSAT builder not provided')
        }
        return csat
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchLatestNpsResponse', () => {
  it('returns the most recent quarterly response', async () => {
    const result = {
      data: {
        quarter_start: '2025-01-01',
        quarter_end: '2025-03-31',
        submitted_at: '2025-02-10T00:00:00Z',
        score: 9,
      },
      error: null,
    }
    const npsBuilder = createNpsBuilder({ selectResult: result })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    const response = await fetchLatestNpsResponse(supabase as any, 'user-1')

    expect(npsBuilder.select).toHaveBeenCalledWith('quarter_start, quarter_end, submitted_at, score')
    expect(npsBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(npsBuilder.order).toHaveBeenCalledWith('quarter_start', { ascending: false })
    expect(npsBuilder.limit).toHaveBeenCalledWith(1)
    expect(response).toEqual(result.data)
  })

  it('throws when Supabase reports an error', async () => {
    const npsBuilder = createNpsBuilder({
      selectResult: { data: null, error: { message: 'boom' } },
    })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    await expect(fetchLatestNpsResponse(supabase as any, 'user-2')).rejects.toThrow(
      /Failed to load NPS responses: boom/
    )
  })
})

describe('hasSubmittedNpsThisQuarter', () => {
  it('returns true when a response exists for the current quarter', async () => {
    const now = new Date('2025-02-20T00:00:00Z')
    const currentQuarter = getQuarterWindow(now)
    const npsBuilder = createNpsBuilder({
      selectResult: {
        data: {
          quarter_start: currentQuarter.startDate,
          quarter_end: currentQuarter.endDate,
          submitted_at: '2025-02-10T00:00:00Z',
          score: 7,
        },
        error: null,
      },
    })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    const result = await hasSubmittedNpsThisQuarter(supabase as any, 'tenant-1', now)
    expect(result).toBe(true)
  })

  it('returns false when the last response was in a previous quarter', async () => {
    const now = new Date('2025-02-20T00:00:00Z')
    const npsBuilder = createNpsBuilder({
      selectResult: {
        data: {
          quarter_start: '2024-10-01',
          quarter_end: '2024-12-31',
          submitted_at: '2024-12-15T00:00:00Z',
          score: 6,
        },
        error: null,
      },
    })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    const result = await hasSubmittedNpsThisQuarter(supabase as any, 'tenant-2', now)
    expect(result).toBe(false)
  })
})

describe('recordNpsResponse', () => {
  it('persists the score and trims optional feedback', async () => {
    const quarter = {
      year: 2025,
      quarter: 1,
      startDate: '2025-01-01',
      endDate: '2025-03-31',
    }
    const npsBuilder = createNpsBuilder({ insertError: null })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    await recordNpsResponse({
      client: supabase as any,
      userId: 'user-3',
      score: 10,
      feedback: '  love the portal  ',
      metadata: { source: 'dashboard_prompt' },
      quarter,
    })

    expect(npsBuilder.insert).toHaveBeenCalledWith({
      user_id: 'user-3',
      score: 10,
      feedback: 'love the portal',
      quarter_start: quarter.startDate,
      quarter_end: quarter.endDate,
      metadata: { source: 'dashboard_prompt' },
    })
  })

  it('throws when the score is outside the allowed range', async () => {
    const npsBuilder = createNpsBuilder({ insertError: null })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    await expect(
      recordNpsResponse({ client: supabase as any, userId: 'user-4', score: 15 })
    ).rejects.toThrow(/between 0 and 10/)
    expect(npsBuilder.insert).not.toHaveBeenCalled()
  })

  it('throws when Supabase rejects the insert', async () => {
    const npsBuilder = createNpsBuilder({ insertError: { message: 'constraint violation' } })
    const supabase = createSurveySupabaseStub({ nps: npsBuilder })

    await expect(
      recordNpsResponse({ client: supabase as any, userId: 'user-5', score: 8 })
    ).rejects.toThrow(/Failed to record NPS response: constraint violation/)
  })
})

describe('recordCsatResponse', () => {
  it('stores a CSAT response with optional comments', async () => {
    const csatBuilder = createCsatBuilder()
    const supabase = createSurveySupabaseStub({ csat: csatBuilder })

    await recordCsatResponse({
      client: supabase as any,
      userId: 'user-6',
      flow: 'maintenance_request',
      contextIdentifier: 'maintenance_request:req-1',
      score: 4,
      comment: '  quick and easy ',
      metadata: { source: 'maintenance_form' },
    })

    expect(csatBuilder.insert).toHaveBeenCalledWith({
      user_id: 'user-6',
      flow: 'maintenance_request',
      context_identifier: 'maintenance_request:req-1',
      score: 4,
      comment: 'quick and easy',
      metadata: { source: 'maintenance_form' },
    })
  })

  it('throws on invalid scores', async () => {
    const csatBuilder = createCsatBuilder()
    const supabase = createSurveySupabaseStub({ csat: csatBuilder })

    await expect(
      recordCsatResponse({
        client: supabase as any,
        userId: 'user-7',
        flow: 'maintenance_request',
        contextIdentifier: 'maintenance_request:req-2',
        score: 0,
      })
    ).rejects.toThrow(/between 1 and 5/)
    expect(csatBuilder.insert).not.toHaveBeenCalled()
  })

  it('throws when the context identifier is missing', async () => {
    const csatBuilder = createCsatBuilder()
    const supabase = createSurveySupabaseStub({ csat: csatBuilder })

    await expect(
      recordCsatResponse({
        client: supabase as any,
        userId: 'user-8',
        flow: 'maintenance_request',
        contextIdentifier: '  ',
        score: 3,
      })
    ).rejects.toThrow(/context identifier is required/)
    expect(csatBuilder.insert).not.toHaveBeenCalled()
  })

  it('throws when Supabase reports an error', async () => {
    const csatBuilder = createCsatBuilder({ message: 'duplicate key value' })
    const supabase = createSurveySupabaseStub({ csat: csatBuilder })

    await expect(
      recordCsatResponse({
        client: supabase as any,
        userId: 'user-9',
        flow: 'maintenance_request',
        contextIdentifier: 'maintenance_request:req-3',
        score: 5,
      })
    ).rejects.toThrow(/Failed to record CSAT response: duplicate key value/)
  })
})
