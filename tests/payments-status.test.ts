import { describe, expect, it } from "vitest"

import {
  AUTOPAY_STATUS_BADGES,
  createRoommateAutopayState,
  describeAutopayStatus,
  deriveAutopayStatusFromStripeStatus,
  getAchSettlementMessage,
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
  },
  {
    roommateId: "rm_beta",
    roommateName: "Blaire Singh",
    unitLabel: "Unit 2A",
    currency: "USD",
    monthlyShare: 1180,
    autopayDay: 1,
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


  it("provides ACH settlement messaging for pending and failed states", () => {
    expect(getAchSettlementMessage("pending", true)).toContain("3–5 business days")
    expect(getAchSettlementMessage("failed", true)).toContain("Autopay is paused")
    expect(getAchSettlementMessage("succeeded", true)).toBeNull()
    expect(getAchSettlementMessage("pending", false)).toBeNull()
  })

  it("exposes badge metadata for autopay statuses", () => {
    expect(AUTOPAY_STATUS_BADGES.active.variant).toBe("complete")
    expect(AUTOPAY_STATUS_BADGES.disabled.label).toBe("Autopay off")
  })
})
