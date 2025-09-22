import { addDays, addMonths, isAfter, startOfDay } from "date-fns"

import type {
  AutopayScheduleConfig,
  AutopayScheduleSettings,
} from "@/types/payments"

import { roundToCurrency } from "./currency"

function clampDayToMonth(reference: Date, targetDay: number): Date {
  const safeDay = Math.min(
    Math.max(Math.round(targetDay), 1),
    new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate(),
  )

  return startOfDay(new Date(reference.getFullYear(), reference.getMonth(), safeDay))
}

export function getNextDueDate(
  settings: AutopayScheduleSettings,
  referenceDate: Date = new Date(),
): Date {
  const normalizedReference = startOfDay(referenceDate)
  const currentMonthDue = clampDayToMonth(normalizedReference, settings.dueDay)

  if (isAfter(normalizedReference, currentMonthDue)) {
    const nextMonth = addMonths(normalizedReference, 1)
    return clampDayToMonth(nextMonth, settings.dueDay)
  }

  return currentMonthDue
}

export function getPreviousDueDate(
  settings: AutopayScheduleSettings,
  referenceDate: Date = new Date(),
): Date {
  const nextDue = getNextDueDate(settings, referenceDate)
  const previousMonth = addMonths(nextDue, -1)
  return clampDayToMonth(previousMonth, settings.dueDay)
}

export function getAutopayChargeDate(
  settings: AutopayScheduleSettings,
  referenceDate: Date = new Date(),
): Date {
  const dueDate = getNextDueDate(settings, referenceDate)
  const leadDays = Math.max(settings.autopayLeadDays, 0)
  return startOfDay(addDays(dueDate, -leadDays))
}

export interface AutopayScheduleWindow {
  autopayDate: Date
  dueDate: Date
  gracePeriodEnd: Date
  lateFeeDate: Date
  retryWindowEnd: Date
}

export function getAutopayScheduleWindow(
  schedule: AutopayScheduleConfig,
  referenceDate: Date = new Date(),
): AutopayScheduleWindow {
  const dueDate = getNextDueDate(schedule.settings, referenceDate)
  const autopayDate = getAutopayChargeDate(schedule.settings, referenceDate)
  const graceDays = Math.max(schedule.settings.gracePeriodDays, 0)
  const retryDays = Math.max(schedule.settings.retryWindowDays, 0)
  const gracePeriodEnd = startOfDay(addDays(dueDate, graceDays))
  const retryWindowEnd = startOfDay(addDays(autopayDate, retryDays))

  return {
    autopayDate,
    dueDate,
    gracePeriodEnd,
    lateFeeDate: gracePeriodEnd,
    retryWindowEnd,
  }
}

export function getBillingPeriod(
  schedule: AutopayScheduleConfig,
  referenceDate: Date = new Date(),
): { start: Date; end: Date } {
  const nextDue = getNextDueDate(schedule.settings, referenceDate)
  const previousDue = clampDayToMonth(addMonths(nextDue, -1), schedule.settings.dueDay)

  return {
    start: previousDue,
    end: nextDue,
  }
}

export function calculateLateFeeAmount(
  schedule: AutopayScheduleConfig,
  baseAmount: number = schedule.rentAmount,
): number {
  const rule = schedule.settings.lateFee

  if (rule.mode === "flat") {
    return roundToCurrency(rule.amount)
  }

  const calculated = roundToCurrency((rule.percentage / 100) * baseAmount)
  if (typeof rule.cap === "number") {
    return roundToCurrency(Math.min(calculated, rule.cap))
  }

  return calculated
}

