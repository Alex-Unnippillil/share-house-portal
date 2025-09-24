import { describe, expect, it } from "vitest"

import {
  AUTOPAY_STATUS_BADGES,
  createRoommateAutopayState,
  describeAutopayStatus,
  deriveAutopayStatusFromStripeStatus,
  summarizeContributionCategories,
} from "@/lib/payments/status"

const sampleBalances = [
  {
    roommateId: "rm_alpha",
    roommateName: "Alex Morgan",
    unitLabel: "Unit 2A",
    currency: "USD",
    monthlyShare: 1200,
    autopayDay: 1,
    autopayStatus: "active" as const,
    lastPaymentDate: "2024-05-30",
    lastPaymentAmount: 1200,
    charges: [
      {
        id: "rent_alpha",
        description: "June rent",
        category: "rent" as const,
        dueDate: "2024-06-01",
        originalAmount: 1200,
        outstandingAmount: 200,
      },
      {
        id: "deposit_alpha",
        description: "Deposit top-up",
        category: "deposit" as const,
        dueDate: "2024-06-15",
        originalAmount: 300,
        outstandingAmount: 150,
      },
    ],
    contacts: {
      primary: { name: "Alex Morgan", email: "alex@example.com" },
    },
    autopaySchedule: {
      leaseDueDay: 1,
      roommateDueDay: 1,
      nextDueDate: "2024-07-01",
      gracePeriodDays: 3,
      gracePeriodEndsOn: "2024-07-04",
      lateFee: {
        amount: 75,
        currency: "USD",
        status: "projected",
        appliesOn: "2024-07-05",
      },
      reminders: [
        {
          id: "rm_alpha_email",
          channel: "email",
          sendAt: "2024-06-27T16:00:00Z",
          status: "scheduled",
          message: "Autopay will run on July 1.",
        },
      ],
    },
  },
  {
    roommateId: "rm_beta",
    roommateName: "Blaire Singh",
    unitLabel: "Unit 2A",
    currency: "USD",
    monthlyShare: 1180,
    autopayDay: 4,
    autopayStatus: "paused" as const,
    lastPaymentDate: "2024-04-28",
    lastPaymentAmount: 600,
    charges: [
      {
        id: "rent_beta",
        description: "June rent",
        category: "rent" as const,
        dueDate: "2024-06-01",
        originalAmount: 1180,
        outstandingAmount: 680,
      },
      {
        id: "utilities_beta",
        description: "Utilities true-up",
        category: "utilities" as const,
        dueDate: "2024-06-10",
        originalAmount: 90,
        outstandingAmount: 90,
      },
    ],
    contacts: {
      primary: { name: "Blaire Singh", email: "blaire@example.com" },
    },
    autopaySchedule: {
      leaseDueDay: 1,
      roommateDueDay: 4,
      nextDueDate: "2024-07-04",
      gracePeriodDays: 5,
      gracePeriodEndsOn: "2024-07-09",
      lateFee: {
        amount: 50,
        currency: "USD",
        status: "scheduled",
        appliesOn: "2024-07-10",
      },
      reminders: [
        {
          id: "rm_beta_email",
          channel: "email",
          sendAt: "2024-06-28T15:00:00Z",
          status: "sent",
          message: "Autopay paused—manual payment required before July 4.",
        },
        {
          id: "rm_beta_sms",
          channel: "sms",
          sendAt: "2024-07-03T17:00:00Z",
          status: "scheduled",
          message: "Reminder: rent share due July 4 with grace through July 9.",
        },
      ],
    },
  },
]

describe("payments status helpers", () => {
  it("summarizes outstanding balances by category", () => {
    const summaries = summarizeContributionCategories(sampleBalances)

    expect(summaries[0]).toMatchObject({ category: "rent", outstandingAmount: 880 })
    expect(summaries.find((summary) => summary.category === "deposit")?.outstandingAmount).toBe(150)
    expect(summaries.find((summary) => summary.category === "utilities")?.chargeCount).toBe(1)
  })

  it("creates roommate autopay state with outstanding totals", () => {
    const state = createRoommateAutopayState(sampleBalances)

    expect(state).toHaveLength(2)
    const alex = state.find((item) => item.roommateId === "rm_alpha")
    expect(alex?.outstanding).toBe(350)
    expect(alex?.autopayStatus).toBe("active")
    expect(alex?.leaseDueDay).toBe(1)
    expect(alex?.reminders).toHaveLength(1)
  })

  it("derives autopay status from Stripe events", () => {
    expect(deriveAutopayStatusFromStripeStatus("paused", "completed", true)).toBe("active")
    expect(deriveAutopayStatusFromStripeStatus("active", "failed", true)).toBe("paused")
    expect(deriveAutopayStatusFromStripeStatus("active", "cancelled", false)).toBe("disabled")
    expect(deriveAutopayStatusFromStripeStatus("paused", "pending", false)).toBe("paused")
  })

  it("describes autopay status consistently", () => {
    expect(describeAutopayStatus("active", 1)).toContain("1st")
    expect(describeAutopayStatus("paused", 15)).toContain("resumes")
    expect(describeAutopayStatus("disabled", 20)).toBe("Autopay off")
  })

  it("exposes badge metadata for autopay statuses", () => {
    expect(AUTOPAY_STATUS_BADGES.active.variant).toBe("complete")
    expect(AUTOPAY_STATUS_BADGES.disabled.label).toBe("Autopay off")
  })

  it("derives effective autopay day from schedule overrides", () => {
    const state = createRoommateAutopayState(sampleBalances)
    const blaire = state.find((item) => item.roommateId === "rm_beta")
    expect(blaire?.autopayDay).toBe(4)
    expect(blaire?.leaseDueDay).toBe(1)
    expect(blaire?.reminders.length).toBeGreaterThan(1)
  })
})
