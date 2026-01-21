import { addDays, differenceInCalendarDays } from "date-fns"

export type TrialRecord = {
  tenantId: string
  planId: string
  startedAt: string
  trialEndsAt: string
  convertedAt?: string | null
  cancelledAt?: string | null
  couponExtensions?: Array<{
    code: string
    days: number
    appliedAt: string
  }>
}

export type TrialEvaluationOptions = {
  now?: Date
  gracePeriodDays?: number
  pendingExtensionDays?: number
}

export type TrialStatus =
  | {
      status: "converted"
      convertedAt: string
      effectiveEnd: string
    }
  | {
      status: "cancelled"
      cancelledAt: string
      effectiveEnd: string
    }
  | {
      status: "active"
      endsAt: string
      daysRemaining: number
      effectiveEnd: string
    }
  | {
      status: "grace_period"
      endsAt: string
      graceEndsAt: string
      daysRemaining: number
      effectiveEnd: string
    }
  | {
      status: "expired"
      endedAt: string
      effectiveEnd: string
    }

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function calculateEffectiveEnd(
  record: TrialRecord,
  pendingExtensionDays = 0
) {
  const baseEnd = parseDate(record.trialEndsAt)
  if (!baseEnd) return null

  const totalExtension =
    (record.couponExtensions ?? []).reduce(
      (sum, extension) => sum + Math.max(0, extension.days),
      0
    ) + Math.max(0, pendingExtensionDays)

  return totalExtension > 0 ? addDays(baseEnd, totalExtension) : baseEnd
}

export function evaluateTrialStatus(
  record: TrialRecord,
  options: TrialEvaluationOptions = {}
): TrialStatus {
  const now = options.now ?? new Date()
  const graceDays = options.gracePeriodDays ?? 5
  const pendingExtensionDays = options.pendingExtensionDays ?? 0

  const effectiveEnd = calculateEffectiveEnd(record, pendingExtensionDays)
  if (!effectiveEnd) {
    return {
      status: "expired",
      endedAt: record.trialEndsAt,
      effectiveEnd: record.trialEndsAt,
    }
  }

  const convertedAt = parseDate(record.convertedAt ?? undefined)
  if (convertedAt) {
    return {
      status: "converted",
      convertedAt: convertedAt.toISOString(),
      effectiveEnd: effectiveEnd.toISOString(),
    }
  }

  const cancelledAt = parseDate(record.cancelledAt ?? undefined)
  if (cancelledAt) {
    return {
      status: "cancelled",
      cancelledAt: cancelledAt.toISOString(),
      effectiveEnd: effectiveEnd.toISOString(),
    }
  }

  const effectiveEndMs = effectiveEnd.getTime()
  const graceEnd = addDays(effectiveEnd, Math.max(0, graceDays))
  const graceEndMs = graceEnd.getTime()

  if (now.getTime() <= effectiveEndMs) {
    const daysRemaining = Math.max(
      0,
      differenceInCalendarDays(effectiveEnd, now)
    )
    return {
      status: "active",
      endsAt: effectiveEnd.toISOString(),
      daysRemaining,
      effectiveEnd: effectiveEnd.toISOString(),
    }
  }

  if (now.getTime() <= graceEndMs) {
    const daysRemaining = Math.max(
      0,
      differenceInCalendarDays(graceEnd, now)
    )
    return {
      status: "grace_period",
      endsAt: effectiveEnd.toISOString(),
      graceEndsAt: graceEnd.toISOString(),
      daysRemaining,
      effectiveEnd: effectiveEnd.toISOString(),
    }
  }

  return {
    status: "expired",
    endedAt: effectiveEnd.toISOString(),
    effectiveEnd: effectiveEnd.toISOString(),
  }
}

