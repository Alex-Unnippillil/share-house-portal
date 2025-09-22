import { format } from 'date-fns'

export type ParsedDateRange = {
  start: Date | null
  end: Date | null
}

export function parsePgDateRange(range: string | null): ParsedDateRange {
  if (!range) {
    return { start: null, end: null }
  }

  const trimmed = range.trim()
  if (trimmed.toLowerCase() === 'empty') {
    return { start: null, end: null }
  }

  const normalized = trimmed.replace(/[\[\]\(\)]/g, '')
  const [startValue, endValue] = normalized.split(',')

  const start = startValue ? new Date(startValue.trim()) : null
  const end = endValue ? new Date(endValue.trim()) : null

  return { start, end }
}

export function formatPgDateRange(
  range: string | null,
  fallback = '—',
  dateFormat = 'MMM d, yyyy'
): string {
  const { start, end } = parsePgDateRange(range)

  if (!start && !end) {
    return fallback
  }

  if (start && end) {
    return `${format(start, dateFormat)} – ${format(end, dateFormat)}`
  }

  const singleDate = start ?? end
  return singleDate ? format(singleDate, dateFormat) : fallback
}

export function buildPgDateRange(start: Date, end: Date): string {
  const startString = format(start, 'yyyy-MM-dd')
  const endString = format(end, 'yyyy-MM-dd')

  return `[${startString},${endString}]`
}
