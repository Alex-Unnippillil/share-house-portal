const DAY_IN_MS = 24 * 60 * 60 * 1000
const HOUR_IN_MS = 60 * 60 * 1000

export const DEFAULT_NPS_COOLDOWN_DAYS = 90
export const DEFAULT_NPS_DISMISSAL_DAYS = 30
export const DEFAULT_CSAT_COOLDOWN_HOURS = 48

export type ShouldDisplayNpsPromptArgs = {
  hasActiveWindow: boolean
  respondedInWindow: boolean
  lastResponseAt?: Date | null
  dismissedAt?: Date | null
  now?: Date
  cooldownDays?: number
  dismissalCooldownDays?: number
}

export function shouldDisplayNpsPrompt({
  hasActiveWindow,
  respondedInWindow,
  lastResponseAt,
  dismissedAt,
  now = new Date(),
  cooldownDays = DEFAULT_NPS_COOLDOWN_DAYS,
  dismissalCooldownDays = DEFAULT_NPS_DISMISSAL_DAYS,
}: ShouldDisplayNpsPromptArgs) {
  if (!hasActiveWindow) {
    return false
  }

  if (respondedInWindow) {
    return false
  }

  if (dismissedAt) {
    const dismissalDelta = now.getTime() - dismissedAt.getTime()
    if (dismissalDelta < dismissalCooldownDays * DAY_IN_MS) {
      return false
    }
  }

  if (lastResponseAt) {
    const responseDelta = now.getTime() - lastResponseAt.getTime()
    if (responseDelta < cooldownDays * DAY_IN_MS) {
      return false
    }
  }

  return true
}

export type ShouldDisplayCsatPromptArgs = {
  respondedToEvent: boolean
  lastResponseAt?: Date | null
  now?: Date
  cooldownHours?: number
}

export function shouldDisplayCsatPrompt({
  respondedToEvent,
  lastResponseAt,
  now = new Date(),
  cooldownHours = DEFAULT_CSAT_COOLDOWN_HOURS,
}: ShouldDisplayCsatPromptArgs) {
  if (respondedToEvent) {
    return false
  }

  if (!lastResponseAt) {
    return true
  }

  const responseDelta = now.getTime() - lastResponseAt.getTime()
  return responseDelta >= cooldownHours * HOUR_IN_MS
}

export function getQuarterKey(date: Date) {
  const year = date.getUTCFullYear()
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return `${year}-Q${quarter}`
}

export function parseIsoDate(value?: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
