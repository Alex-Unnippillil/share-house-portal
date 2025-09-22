import { describe, expect, it } from "vitest"

import {
  calculateLateFeeAmount,
  getAutopayScheduleWindow,
  getBillingPeriod,
  getNextDueDate,
} from "@/lib/payments/autopay"
import type { AutopayScheduleConfig } from "@/types/payments"

const baseSchedule: AutopayScheduleConfig = {
  id: "autopay_test",
  unitId: "unit_test",
  unitLabel: "Unit Test",
  currency: "USD",
  rentAmount: 1500,
  autopayEnabled: true,
  settings: {
    dueDay: 1,
    autopayLeadDays: 3,
    gracePeriodDays: 4,
    retryWindowDays: 2,
    autopayTime: "09:00",
    timezone: "America/New_York",
    lateFee: {
      mode: "percentage",
      percentage: 5,
      cap: 100,
    },
  },
  participants: [],
  lastRun: {
    processedAt: "2024-05-01T09:00:00-04:00",
    status: "succeeded",
    totalCollected: 1500,
  },
}

describe("autopay scheduling helpers", () => {
  it("computes the next due date relative to the reference day", () => {
    const beforeDue = getNextDueDate(baseSchedule.settings, new Date("2024-04-28T00:00:00Z"))
    const afterDue = getNextDueDate(baseSchedule.settings, new Date("2024-05-05T00:00:00Z"))

    expect(beforeDue.toISOString().slice(0, 10)).toBe("2024-05-01")
    expect(afterDue.toISOString().slice(0, 10)).toBe("2024-06-01")
  })

  it("describes the upcoming autopay window with grace and retry periods", () => {
    const window = getAutopayScheduleWindow(baseSchedule, new Date("2024-05-15T00:00:00Z"))

    expect(window.dueDate.toISOString().slice(0, 10)).toBe("2024-06-01")
    expect(window.autopayDate.toISOString().slice(0, 10)).toBe("2024-05-29")
    expect(window.gracePeriodEnd.toISOString().slice(0, 10)).toBe("2024-06-05")
    expect(window.lateFeeDate.toISOString().slice(0, 10)).toBe("2024-06-05")
    expect(window.retryWindowEnd.toISOString().slice(0, 10)).toBe("2024-05-31")
  })

  it("calculates late fees with percentage caps and flat amounts", () => {
    const percentageFee = calculateLateFeeAmount(baseSchedule)
    expect(percentageFee).toBeCloseTo(75)

    const flatSchedule: AutopayScheduleConfig = {
      ...baseSchedule,
      settings: {
        ...baseSchedule.settings,
        lateFee: {
          mode: "flat",
          amount: 60,
        },
      },
    }

    expect(calculateLateFeeAmount(flatSchedule)).toBe(60)
  })

  it("returns the billing period range spanning one cycle", () => {
    const period = getBillingPeriod(baseSchedule, new Date("2024-05-15T00:00:00Z"))

    expect(period.start.toISOString().slice(0, 10)).toBe("2024-05-01")
    expect(period.end.toISOString().slice(0, 10)).toBe("2024-06-01")
  })
})
