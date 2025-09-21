import { describe, expect, it } from "vitest"

import {
  calculateLateFee,
  calculateMonthlyDueDate,
  calculateNextDueDate,
  deriveOccurrenceStatus,
  generateScheduleWindow,
  type RentPaymentOccurrenceRow,
  type RentPaymentScheduleRow,
} from "@/lib/payments/autopay-scheduler"

describe("autopay scheduler helpers", () => {
  it("clamps due dates to the last day of the month", () => {
    const januaryReference = new Date("2024-01-15T00:00:00Z")
    const februaryDue = calculateMonthlyDueDate(januaryReference, 31)

    expect(februaryDue.getUTCFullYear()).toBe(2024)
    expect(februaryDue.getUTCMonth()).toBe(0)
    expect(februaryDue.getUTCDate()).toBe(31)

    const februaryReference = new Date("2024-02-11T00:00:00Z")
    const februaryEnd = calculateMonthlyDueDate(februaryReference, 31)

    expect(februaryEnd.getUTCMonth()).toBe(1)
    expect(februaryEnd.getUTCDate()).toBe(29)
  })

  it("calculates the next due date relative to the anchor", () => {
    const anchor = new Date("2024-05-01T00:00:00Z")
    const reference = new Date("2024-05-10T00:00:00Z")

    const due = calculateNextDueDate(15, reference, anchor)
    expect(due.toISOString()).toBe("2024-05-15T00:00:00.000Z")

    const beforeAnchor = new Date("2024-04-20T00:00:00Z")
    const firstDue = calculateNextDueDate(5, beforeAnchor, anchor)
    expect(firstDue.toISOString()).toBe(anchor.toISOString())
  })

  it("generates a rolling window of due dates", () => {
    const now = new Date("2024-03-15T00:00:00Z")
    const anchor = new Date("2024-01-10T00:00:00Z")

    const dueDates = generateScheduleWindow({
      anchorDate: anchor,
      dayOfMonth: 10,
      now,
      monthsForward: 2,
      monthsBack: 1,
    })

    const isoDates = dueDates.map((date) => date.toISOString())
    expect(isoDates).toEqual([
      "2024-02-10T00:00:00.000Z",
      "2024-03-10T00:00:00.000Z",
      "2024-04-10T00:00:00.000Z",
      "2024-05-10T00:00:00.000Z",
    ])
  })

  it("computes flat and percentage late fees", () => {
    const dueDate = new Date("2024-05-01T00:00:00Z")
    const now = new Date("2024-05-06T12:00:00Z")

    const flatFee = calculateLateFee(
      200_00,
      { type: "flat", flatCents: 50_00 },
      { dueDate, now, gracePeriodDays: 3 }
    )
    expect(flatFee).toBe(50_00)

    const percentFee = calculateLateFee(
      200_00,
      { type: "percentage", percent: 15, capCents: 20_00 },
      { dueDate, now, gracePeriodDays: 3 }
    )
    expect(percentFee).toBe(20_00)
  })

  it("derives occurrence statuses based on schedule configuration", () => {
    const schedule: Pick<RentPaymentScheduleRow, "autopay_enabled"> = {
      autopay_enabled: false,
    }
    const occurrence: Pick<
      RentPaymentOccurrenceRow,
      "status" | "due_date" | "paid_at"
    > = {
      status: "scheduled",
      due_date: "2024-05-01",
      paid_at: null,
    }

    const overdueStatus = deriveOccurrenceStatus(schedule, occurrence, new Date("2024-05-05T00:00:00Z"))
    expect(overdueStatus).toBe("overdue")

    const autopaySchedule: Pick<RentPaymentScheduleRow, "autopay_enabled"> = {
      autopay_enabled: true,
    }

    const queuedStatus = deriveOccurrenceStatus(
      autopaySchedule,
      occurrence,
      new Date("2024-04-28T00:00:00Z")
    )
    expect(queuedStatus).toBe("queued")
  })
})
