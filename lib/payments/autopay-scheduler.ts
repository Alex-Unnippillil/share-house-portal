import {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isEqual,
  max,
  startOfDay,
  startOfMonth,
} from "date-fns"

import type { Database } from "@/lib/supabase"

export type RentPaymentScheduleRow = Database["public"]["Tables"]["rent_payment_schedules"]["Row"]
export type RentPaymentOccurrenceRow = Database["public"]["Tables"]["rent_payment_occurrences"]["Row"]

export type LateFeeConfig =
  | { type: "flat"; flatCents: number; capCents?: number | null }
  | { type: "percentage"; percent: number; capCents?: number | null }

export type DerivedOccurrenceStatus =
  | "scheduled"
  | "queued"
  | "processing"
  | "paid"
  | "failed"
  | "overdue"
  | "skipped"

const DATE_FORMAT = "yyyy-MM-dd"

export function clampDayForMonth(reference: Date, dayOfMonth: number): Date {
  const endOfReferenceMonth = addDays(startOfDay(addMonths(startOfMonth(reference), 1)), -1)
  const targetDay = Math.min(dayOfMonth, endOfReferenceMonth.getDate())
  const result = new Date(reference)
  result.setDate(targetDay)
  return startOfDay(result)
}

export function calculateMonthlyDueDate(reference: Date, dayOfMonth: number): Date {
  const monthStart = startOfMonth(reference)
  const result = new Date(monthStart)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  const daysInMonth = clampDayForMonth(monthStart, dayOfMonth).getDate()
  result.setDate(daysInMonth)
  return startOfDay(result)
}

export function calculateNextDueDate(
  dayOfMonth: number,
  referenceDate: Date,
  anchorDate: Date
): Date {
  const normalizedReference = startOfDay(referenceDate)
  const normalizedAnchor = startOfDay(anchorDate)
  if (isBefore(normalizedReference, normalizedAnchor) || isEqual(normalizedReference, normalizedAnchor)) {
    return normalizedAnchor
  }
  const candidate = calculateMonthlyDueDate(normalizedReference, dayOfMonth)
  if (!isBefore(candidate, normalizedReference)) {
    return candidate
  }
  const nextMonth = addMonths(normalizedReference, 1)
  return calculateMonthlyDueDate(nextMonth, dayOfMonth)
}

export function generateScheduleWindow(options: {
  anchorDate: Date
  dayOfMonth: number
  now?: Date
  monthsForward?: number
  monthsBack?: number
}): Date[] {
  const { anchorDate, dayOfMonth, now = new Date(), monthsForward = 6, monthsBack = 1 } = options
  const normalizedAnchor = startOfDay(anchorDate)
  const windowStart = startOfMonth(addMonths(now, -monthsBack))
  const computedWindowEnd = addMonths(startOfMonth(now), monthsForward)
  const windowEnd = max([computedWindowEnd, startOfMonth(normalizedAnchor)])

  const dueDates: Date[] = []
  let cursor = startOfMonth(normalizedAnchor)
  const anchorMonth = startOfMonth(normalizedAnchor)

  while (differenceInCalendarMonths(windowEnd, cursor) >= 0) {
    let dueDate: Date
    if (differenceInCalendarMonths(cursor, anchorMonth) === 0) {
      dueDate = normalizedAnchor
    } else {
      dueDate = calculateMonthlyDueDate(cursor, dayOfMonth)
    }

    if (!isBefore(dueDate, normalizedAnchor) && !isBefore(dueDate, windowStart)) {
      dueDates.push(startOfDay(dueDate))
    }

    cursor = addMonths(cursor, 1)
  }

  return dueDates
}

export function calculateGraceDate(dueDate: Date, gracePeriodDays: number): Date {
  return startOfDay(addDays(dueDate, gracePeriodDays))
}

export function calculateLateFee(
  amountCents: number,
  config: LateFeeConfig,
  options: { now?: Date; dueDate: Date; gracePeriodDays: number; paidAt?: Date | null }
): number {
  const { now = new Date(), dueDate, gracePeriodDays, paidAt } = options
  const graceExpiry = endOfDay(addDays(dueDate, gracePeriodDays))
  const comparisonDate = paidAt ?? now

  if (!isAfter(comparisonDate, graceExpiry)) {
    return 0
  }

  let fee = 0
  if (config.type === "flat") {
    fee = Math.max(0, config.flatCents)
  } else {
    fee = Math.round(amountCents * (Math.max(0, config.percent) / 100))
  }

  if (config.capCents != null && config.capCents >= 0) {
    fee = Math.min(fee, config.capCents)
  }

  return fee
}

export function deriveOccurrenceStatus(
  schedule: Pick<RentPaymentScheduleRow, "autopay_enabled">,
  occurrence: Pick<RentPaymentOccurrenceRow, "status" | "due_date" | "paid_at">,
  now: Date = new Date()
): DerivedOccurrenceStatus {
  const status = occurrence.status as DerivedOccurrenceStatus
  if (["paid", "failed", "skipped"].includes(status)) {
    return status
  }

  if (status === "overdue" || status === "processing") {
    return status
  }

  const dueDate = startOfDay(new Date(occurrence.due_date))
  const today = startOfDay(now)

  if (schedule.autopay_enabled) {
    return isBefore(dueDate, today) ? "processing" : "queued"
  }

  return isBefore(dueDate, today) ? "overdue" : "scheduled"
}

export function formatDateForSql(date: Date): string {
  return format(startOfDay(date), DATE_FORMAT)
}

export function buildLateFeeConfig(schedule: RentPaymentScheduleRow): LateFeeConfig {
  if (schedule.late_fee_type === "percentage") {
    return {
      type: "percentage",
      percent: schedule.late_fee_percent ?? 0,
      capCents: schedule.late_fee_cap_cents,
    }
  }

  return {
    type: "flat",
    flatCents: schedule.late_fee_flat_cents ?? 0,
    capCents: schedule.late_fee_cap_cents,
  }
}

export function getNextRunDate(schedule: RentPaymentScheduleRow, now: Date = new Date()): Date {
  const anchor = startOfDay(new Date(schedule.anchor_date))
  return calculateNextDueDate(schedule.day_of_month, now, anchor)
}
