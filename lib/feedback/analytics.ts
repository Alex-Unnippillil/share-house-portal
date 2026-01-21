import type { Database } from "@/lib/supabase"

import { getQuarterKey, parseIsoDate } from "./prompt-logic"

type NpsRow = Database['public']['Tables']['nps_responses']['Row']
type CsatRow = Database['public']['Tables']['csat_responses']['Row']

type NpsRecord = {
  score: number
  createdAt: Date
  feedback?: string | null
}

type CsatRecord = {
  rating: number
  context: CsatRow['context']
  createdAt: Date
}

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function shiftMonths(date: Date, delta: number) {
  const shifted = startOfMonth(date)
  shifted.setUTCMonth(shifted.getUTCMonth() + delta)
  return shifted
}

export function calculateNpsScore(scores: number[]) {
  if (!scores.length) {
    return null
  }

  const total = scores.length
  const promoters = scores.filter((score) => score >= 9).length
  const detractors = scores.filter((score) => score <= 6).length
  const rawScore = ((promoters - detractors) / total) * 100
  return Math.round(rawScore)
}

export function calculateAverage(ratings: number[]) {
  if (!ratings.length) {
    return null
  }

  const sum = ratings.reduce((total, rating) => total + rating, 0)
  return Number((sum / ratings.length).toFixed(2))
}

function buildDistribution(scores: number[]) {
  return scores.reduce(
    (acc, score) => {
      if (score >= 9) {
        acc.promoters += 1
      } else if (score >= 7) {
        acc.passives += 1
      } else {
        acc.detractors += 1
      }

      return acc
    },
    { promoters: 0, passives: 0, detractors: 0 },
  )
}

export type FeedbackAnalytics = {
  nps: {
    currentScore: number | null
    previousScore: number | null
    trendDelta: number | null
    responseCount: number
    distribution: ReturnType<typeof buildDistribution>
    recentComments: Array<{ feedback: string; createdAt: string }>
  }
  csat: {
    averageRating: number | null
    responseCount: number
    contextBreakdown: Array<{
      context: CsatRow['context']
      average: number | null
      count: number
    }>
  }
  timeline: Array<{
    period: string
    npsScore: number | null
    csatAverage: number | null
  }>
}

export function computeFeedbackAnalytics(
  npsResponses: NpsRow[],
  csatResponses: CsatRow[],
  now = new Date(),
): FeedbackAnalytics {
  const npsRecords: NpsRecord[] = npsResponses
    .map((row) => {
      const createdAt = parseIsoDate(row.created_at)
      if (!createdAt) {
        return null
      }

      return {
        score: row.score,
        createdAt,
        feedback: row.feedback,
      }
    })
    .filter(isDefined)

  const csatRecords: CsatRecord[] = csatResponses
    .map((row) => {
      const createdAt = parseIsoDate(row.created_at)
      if (!createdAt) {
        return null
      }

      return {
        rating: row.rating,
        context: row.context,
        createdAt,
      }
    })
    .filter(isDefined)

  const npsByQuarter = new Map<string, number[]>()
  for (const record of npsRecords) {
    const key = getQuarterKey(record.createdAt)
    const scores = npsByQuarter.get(key) ?? []
    scores.push(record.score)
    npsByQuarter.set(key, scores)
  }

  const currentQuarterKey = getQuarterKey(now)
  const previousQuarterKey = getQuarterKey(shiftMonths(now, -3))

  const currentQuarterScores = npsByQuarter.get(currentQuarterKey) ?? []
  const previousQuarterScores = npsByQuarter.get(previousQuarterKey) ?? []

  const currentScore = calculateNpsScore(currentQuarterScores)
  const previousScore = calculateNpsScore(previousQuarterScores)
  const trendDelta =
    currentScore !== null && previousScore !== null
      ? currentScore - previousScore
      : null

  const distributionSource = currentQuarterScores.length
    ? currentQuarterScores
    : npsRecords.map((record) => record.score)

  const timeline: FeedbackAnalytics['timeline'] = []
  const monthsToDisplay = 6
  for (let index = monthsToDisplay - 1; index >= 0; index -= 1) {
    const periodStart = shiftMonths(now, -index)
    const periodEnd = shiftMonths(now, -index + 1)

    const periodNpsScores = npsRecords
      .filter(
        (record) =>
          record.createdAt >= periodStart && record.createdAt < periodEnd,
      )
      .map((record) => record.score)

    const periodCsatRatings = csatRecords
      .filter(
        (record) =>
          record.createdAt >= periodStart && record.createdAt < periodEnd,
      )
      .map((record) => record.rating)

    timeline.push({
      period: monthFormatter.format(periodStart),
      npsScore: calculateNpsScore(periodNpsScores),
      csatAverage: calculateAverage(periodCsatRatings),
    })
  }

  const recentComments = npsRecords
    .filter((record) => Boolean(record.feedback?.trim()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3)
    .map((record) => ({
      feedback: record.feedback!.trim(),
      createdAt: record.createdAt.toISOString(),
    }))

  const csatByContext = new Map<CsatRow['context'], number[]>()
  for (const record of csatRecords) {
    const ratings = csatByContext.get(record.context) ?? []
    ratings.push(record.rating)
    csatByContext.set(record.context, ratings)
  }

  return {
    nps: {
      currentScore,
      previousScore,
      trendDelta,
      responseCount: npsRecords.length,
      distribution: buildDistribution(distributionSource),
      recentComments,
    },
    csat: {
      averageRating: calculateAverage(csatRecords.map((record) => record.rating)),
      responseCount: csatRecords.length,
      contextBreakdown: Array.from(csatByContext.entries()).map(
        ([context, ratings]) => ({
          context,
          average: calculateAverage(ratings),
          count: ratings.length,
        }),
      ),
    },
    timeline,
  }
}
