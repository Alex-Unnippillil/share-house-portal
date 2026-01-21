import { calculateOutstanding, formatAutopayDay } from "./catch-up"
import { roundToCurrency } from "./currency"

import type {
  AutopayLateFee,
  AutopayReminder,
  AutopayStatus,
  AutopaySchedule,
  CatchUpBalance,
  CatchUpChargeCategory,
} from "@/types/payments"

export const AUTOPAY_STATUS_BADGES: Record<
  AutopayStatus,
  { label: string; variant: "complete" | "secondary" | "outline" }
> = {
  active: { label: "Autopay active", variant: "complete" },
  paused: { label: "Autopay paused", variant: "secondary" },
  disabled: { label: "Autopay off", variant: "outline" },
}

export function describeAutopayStatus(
  status: AutopayStatus,
  autopayDay: number,
): string {
  const autopayDayLabel = formatAutopayDay(autopayDay)

  switch (status) {
    case "active":
      return `Autopay active · ${autopayDayLabel} each month`
    case "paused":
      return `Autopay paused · resumes ${autopayDayLabel}`
    case "disabled":
      return "Autopay off"
    default:
      return "Autopay"
  }
}

export interface RoommateAutopayState {
  roommateId: string
  roommateName: string
  unitLabel: string
  autopayStatus: AutopayStatus
  autopayDay: number
  outstanding: number
  currency: string
  lastPaymentAmount: number
  lastPaymentDate: string
  leaseDueDay?: number
  roommateDueDay?: number
  nextDueDate?: string
  gracePeriodDays?: number
  gracePeriodEndsOn?: string
  lateFee?: AutopayLateFee
  reminders: AutopayReminder[]
}

export function getEffectiveAutopayDay(
  schedule: AutopaySchedule | undefined,
  fallbackDay: number,
): number {
  if (!schedule) {
    return fallbackDay
  }

  return schedule.roommateDueDay ?? schedule.leaseDueDay ?? fallbackDay
}

export function createRoommateAutopayState(
  balances: CatchUpBalance[],
): RoommateAutopayState[] {
  return balances.map((balance) => ({
    roommateId: balance.roommateId,
    roommateName: balance.roommateName,
    unitLabel: balance.unitLabel,
    autopayStatus: balance.autopayStatus,
    autopayDay: getEffectiveAutopayDay(
      balance.autopaySchedule,
      balance.autopayDay,
    ),
    outstanding: roundToCurrency(calculateOutstanding(balance.charges)),
    currency: balance.currency,
    lastPaymentAmount: balance.lastPaymentAmount,
    lastPaymentDate: balance.lastPaymentDate,
    leaseDueDay: balance.autopaySchedule?.leaseDueDay,
    roommateDueDay: balance.autopaySchedule?.roommateDueDay,
    nextDueDate: balance.autopaySchedule?.nextDueDate,
    gracePeriodDays: balance.autopaySchedule?.gracePeriodDays,
    gracePeriodEndsOn: balance.autopaySchedule?.gracePeriodEndsOn,
    lateFee: balance.autopaySchedule?.lateFee,
    reminders: balance.autopaySchedule?.reminders ?? [],
  }))
}

export interface ContributionCategorySummary {
  category: CatchUpChargeCategory
  outstandingAmount: number
  originalAmount: number
  chargeCount: number
}

export function summarizeContributionCategories(
  balances: CatchUpBalance[],
): ContributionCategorySummary[] {
  const categoryMap = new Map<CatchUpChargeCategory, ContributionCategorySummary>()

  for (const balance of balances) {
    for (const charge of balance.charges) {
      const current =
        categoryMap.get(charge.category) ??
        ({
          category: charge.category,
          outstandingAmount: 0,
          originalAmount: 0,
          chargeCount: 0,
        } as ContributionCategorySummary)

      current.outstandingAmount = roundToCurrency(
        current.outstandingAmount + charge.outstandingAmount,
      )
      current.originalAmount = roundToCurrency(
        current.originalAmount + charge.originalAmount,
      )
      current.chargeCount += 1

      categoryMap.set(charge.category, current)
    }
  }

  return Array.from(categoryMap.values()).sort(
    (a, b) => b.outstandingAmount - a.outstandingAmount,
  )
}

export function deriveAutopayStatusFromStripeStatus(
  currentStatus: AutopayStatus,
  stripeStatus: string,
  hasSubscription: boolean,
): AutopayStatus {
  const normalized = stripeStatus.toLowerCase()

  if (normalized === "failed") {
    return "paused"
  }

  if (normalized === "cancelled") {
    return "disabled"
  }

  if (
    (normalized === "succeeded" || normalized === "completed" || normalized === "paid") &&
    hasSubscription
  ) {
    return "active"
  }

  return currentStatus
}
