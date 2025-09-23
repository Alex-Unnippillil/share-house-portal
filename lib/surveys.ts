export type QuarterInfo = {
  period: string
  label: string
  start: Date
  end: Date
}

const QUARTER_LABELS = [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
] as const

type QuarterTuple = [year: number, quarter: number]

function getQuarterTuple(date: Date): QuarterTuple {
  const year = date.getUTCFullYear()
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return [year, quarter]
}

export function getQuarterInfo(date: Date = new Date()): QuarterInfo {
  const [year, quarter] = getQuarterTuple(date)
  const startMonth = (quarter - 1) * 3
  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999))

  return {
    period: `${year}-Q${quarter}`,
    label: `${QUARTER_LABELS[quarter - 1]} ${year}`,
    start,
    end,
  }
}

export function getCurrentNpsPeriod(date: Date = new Date()): string {
  return getQuarterInfo(date).period
}

export function getQuarterDateRange(date: Date = new Date()): {
  start: string
  end: string
} {
  const info = getQuarterInfo(date)
  return {
    start: info.start.toISOString(),
    end: info.end.toISOString(),
  }
}

export function parseSurveyPeriod(period: string): QuarterTuple {
  const match = period.match(/^(\d{4})-Q([1-4])$/)
  if (!match) {
    throw new Error(`Invalid survey period: ${period}`)
  }

  return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)]
}

export function compareSurveyPeriods(a: string, b: string): number {
  const [aYear, aQuarter] = parseSurveyPeriod(a)
  const [bYear, bQuarter] = parseSurveyPeriod(b)

  if (aYear !== bYear) {
    return aYear - bYear
  }

  return aQuarter - bQuarter
}

export function isNpsSurveyDue(
  lastCompletedPeriod: string | null,
  date: Date = new Date(),
): boolean {
  if (!lastCompletedPeriod) {
    return true
  }

  const currentPeriod = getCurrentNpsPeriod(date)
  return compareSurveyPeriods(lastCompletedPeriod, currentPeriod) < 0
}
