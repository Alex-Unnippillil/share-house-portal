import { describe, expect, it } from "vitest"

import {
  allocatePaymentToCharges,
  applyAllocationsToCharges,
  calculateOutstanding,
  formatAutopayDay,
  generateMockPaymentIntentId,
} from "@/lib/payments/catch-up"
import type { CatchUpCharge } from "@/types/payments"

import { loadCatchUpBalances } from "@/app/payments/loaders"

const sampleCharges: CatchUpCharge[] = [
  {
    id: "charge_rent",
    description: "June rent share",
    category: "rent",
    dueDate: "2024-06-01",
    originalAmount: 1200,
    outstandingAmount: 450.25,
  },
  {
    id: "charge_wifi",
    description: "Wi-Fi",
    category: "utilities",
    dueDate: "2024-06-10",
    originalAmount: 45,
    outstandingAmount: 45,
  },
  {
    id: "charge_supplies",
    description: "Household supplies",
    category: "fees",
    dueDate: "2024-06-15",
    originalAmount: 32,
    outstandingAmount: 12.5,
  },
]

describe("catch-up helpers", () => {
  it("calculates outstanding totals with cent precision", () => {
    const total = calculateOutstanding(sampleCharges)
    expect(total).toBeCloseTo(507.75)
  })

  it("allocates partial payments to the earliest due charges first", () => {
    const allocations = allocatePaymentToCharges(sampleCharges, 200)
    expect(allocations).toHaveLength(1)
    expect(allocations[0]).toEqual({ chargeId: "charge_rent", amount: 200 })
  })

  it("spreads payments across multiple charges when needed", () => {
    const allocations = allocatePaymentToCharges(sampleCharges, 480)
    expect(allocations).toEqual([
      { chargeId: "charge_rent", amount: 450.25 },
      { chargeId: "charge_wifi", amount: 29.75 },
    ])
  })

  it("prevents allocating more than the outstanding balance", () => {
    expect(() => allocatePaymentToCharges(sampleCharges, 600)).toThrow(
      "Catch-up amount exceeds outstanding charges.",
    )
  })

  it("reduces outstanding amounts after applying allocations", () => {
    const allocations = [
      { chargeId: "charge_rent", amount: 450.25 },
      { chargeId: "charge_wifi", amount: 29.75 },
    ]

    const updated = applyAllocationsToCharges(sampleCharges, allocations)
    expect(updated.find((charge) => charge.id === "charge_rent")?.outstandingAmount).toBe(0)
    expect(updated.find((charge) => charge.id === "charge_wifi")?.outstandingAmount).toBeCloseTo(15.25)
    expect(updated.find((charge) => charge.id === "charge_supplies")?.outstandingAmount).toBe(12.5)
  })

  it("formats autopay day with ordinal suffix", () => {
    expect(formatAutopayDay(1)).toBe("1st")
    expect(formatAutopayDay(2)).toBe("2nd")
    expect(formatAutopayDay(3)).toBe("3rd")
    expect(formatAutopayDay(11)).toBe("11th")
    expect(formatAutopayDay(22)).toBe("22nd")
  })

  it("generates mock payment intent identifiers", () => {
    const id = generateMockPaymentIntentId()
    expect(id.startsWith("pi_")).toBe(true)
    expect(id.length).toBeGreaterThan(5)
  })

  it("exposes catch-up balances from the server loader", async () => {
    const balances = await loadCatchUpBalances()
    expect(balances.length).toBeGreaterThan(0)
    for (const balance of balances) {
      expect(balance.roommateId).toMatch(/^rm_/)
      expect(balance.charges.length).toBeGreaterThan(0)
    }
  })
})
