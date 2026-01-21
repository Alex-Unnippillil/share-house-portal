export type QuarterNumber = 1 | 2 | 3 | 4

export type QuarterWindow = {
  year: number
  quarter: QuarterNumber
  startDate: string
  endDate: string
}

const ISO_DATE_LENGTH = 10

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH)
}

export function getQuarterWindow(referenceDate: Date = new Date()): QuarterWindow {
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth()
  const quarterIndex = Math.floor(month / 3)
  const quarter = (quarterIndex + 1) as QuarterNumber
  const startMonth = quarterIndex * 3

  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 3, 0))

  return {
    year,
    quarter,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  }
}

export function shouldTriggerQuarterlyNps(
  lastCompletedQuarterStart: string | null,
  now: Date = new Date()
): boolean {
  const currentQuarterStart = getQuarterWindow(now).startDate

  if (!lastCompletedQuarterStart) {
    return true
  }

  return lastCompletedQuarterStart !== currentQuarterStart
}

export function formatQuarterLabel(window: QuarterWindow): string {
  return `Q${window.quarter} ${window.year}`
}

export const CSAT_FLOW_MAINTENANCE = 'maintenance_request' as const

export function buildMaintenanceCsatContext(requestId: string): string {
  return `${CSAT_FLOW_MAINTENANCE}:${requestId}`
}
