import { describe, expect, it } from "vitest"

import {
  calculatePurchaseShares,
  type HouseholdMembershipRow,
  type SupplyPurchaseRow,
} from "@/lib/supply-ledger"

const householdId = "household-test"

const createdAt = "2024-07-01T00:00:00.000Z"

const memberships: HouseholdMembershipRow[] = [
  {
    id: "membership-a",
    household_id: householdId,
    profile_id: "profile-a",
    weighting_factor: 2,
    role: "primary tenant",
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "membership-b",
    household_id: householdId,
    profile_id: "profile-b",
    weighting_factor: 1,
    role: "roommate",
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "membership-c",
    household_id: householdId,
    profile_id: "profile-c",
    weighting_factor: 1,
    role: "roommate",
    created_at: createdAt,
    updated_at: createdAt,
  },
]

describe("supply ledger share calculations", () => {
  it("splits totals evenly when default split is even", () => {
    const purchase: SupplyPurchaseRow = {
      id: "purchase-even",
      household_id: householdId,
      purchaser_id: "profile-a",
      description: "Shared spices",
      total_cost: 60,
      purchased_at: "2024-07-01T12:00:00.000Z",
      default_split: "even",
      created_at: createdAt,
      updated_at: createdAt,
    }

    const result = calculatePurchaseShares(purchase, memberships)
    const amounts = result.shares.map((share) => share.amount)

    expect(result.mode).toBe("even")
    expect(amounts).toEqual([20, 20, 20])
    expect(result.total).toBe(60)
    expect(result.shares.reduce((sum, share) => sum + share.amount, 0)).toBeCloseTo(60, 2)
  })

  it("weights amounts by membership factor when default split is weighted", () => {
    const purchase: SupplyPurchaseRow = {
      id: "purchase-weighted",
      household_id: householdId,
      purchaser_id: "profile-b",
      description: "Bulk cleaning supplies",
      total_cost: 120,
      purchased_at: "2024-07-05T12:00:00.000Z",
      default_split: "weighted",
      created_at: createdAt,
      updated_at: createdAt,
    }

    const result = calculatePurchaseShares(purchase, memberships)

    expect(result.mode).toBe("weighted")
    expect(result.total).toBe(120)

    const sharesByProfile = Object.fromEntries(
      result.shares.map((share) => [share.profileId, share.amount])
    )

    expect(sharesByProfile["profile-a"]).toBeCloseTo(60, 2)
    expect(sharesByProfile["profile-b"]).toBeCloseTo(30, 2)
    expect(sharesByProfile["profile-c"]).toBeCloseTo(30, 2)
    expect(result.shares.reduce((sum, share) => sum + share.amount, 0)).toBeCloseTo(120, 2)
  })
})
