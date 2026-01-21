import { describe, expect, it } from "vitest"

import { handleHouseholdMembershipChange } from "@/app/supplies/actions/household-membership"
import {
  detectMembershipChanges,
  generateSupplyShares,
  type HouseholdMembership,
  type SupplyPurchase,
  type SupplyShare,
} from "@/lib/supplies/share-generator"

const HOUSEHOLD_ID = "house_apricot"

function buildExistingShare(
  purchaseId: string,
  memberId: string,
  amount: number,
  membershipSnapshot: string[],
  purchaseDate: string,
): SupplyShare {
  return {
    purchaseId,
    memberId,
    amount,
    householdId: HOUSEHOLD_ID,
    calculatedAt: "2024-01-01T00:00:00.000Z",
    membershipSnapshot,
    purchaseDate,
  }
}

const baseMemberships: HouseholdMembership[] = [
  {
    householdId: HOUSEHOLD_ID,
    memberId: "avery",
    joinedAt: "2024-01-01T00:00:00Z",
  },
  {
    householdId: HOUSEHOLD_ID,
    memberId: "jordan",
    joinedAt: "2024-01-01T00:00:00Z",
  },
]

const purchases: SupplyPurchase[] = [
  {
    id: "jan_cleaning",
    householdId: HOUSEHOLD_ID,
    amount: 30,
    purchasedAt: "2024-01-10T12:00:00Z",
    description: "Cleaning supplies",
  },
  {
    id: "feb_detergent",
    householdId: HOUSEHOLD_ID,
    amount: 45,
    purchasedAt: "2024-02-14T12:00:00Z",
    description: "Laundry detergent",
  },
  {
    id: "mar_detergent",
    householdId: HOUSEHOLD_ID,
    amount: 36,
    purchasedAt: "2024-03-20T12:00:00Z",
    description: "Bulk cleaning essentials",
  },
  {
    id: "apr_sponges",
    householdId: HOUSEHOLD_ID,
    amount: 28,
    purchasedAt: "2024-04-04T12:00:00Z",
    description: "Sponges and dish soap",
  },
]

const existingShares: SupplyShare[] = [
  buildExistingShare("jan_cleaning", "avery", 15, ["avery", "jordan"], purchases[0].purchasedAt),
  buildExistingShare("jan_cleaning", "jordan", 15, ["avery", "jordan"], purchases[0].purchasedAt),
  buildExistingShare("feb_detergent", "avery", 22.5, ["avery", "jordan"], purchases[1].purchasedAt),
  buildExistingShare("feb_detergent", "jordan", 22.5, ["avery", "jordan"], purchases[1].purchasedAt),
]

describe("detectMembershipChanges", () => {
  it("flags additions and removals between snapshots", () => {
    const summary = detectMembershipChanges(
      ["avery", "jordan"],
      ["avery", "jordan", "priya"],
    )

    expect(summary.changed).toBe(true)
    expect(summary.added).toEqual(["priya"])
    expect(summary.removed).toEqual([])
    expect(summary.unchanged).toEqual(["avery", "jordan"])
  })
})

describe("generateSupplyShares", () => {
  it("only recalculates purchases on or after the effective date", () => {
    const memberships: HouseholdMembership[] = [
      ...baseMemberships,
      {
        householdId: HOUSEHOLD_ID,
        memberId: "priya",
        joinedAt: "2024-03-05T00:00:00Z",
      },
    ]

    const { createdShares, skippedPurchases } = generateSupplyShares({
      householdId: HOUSEHOLD_ID,
      memberships,
      purchases,
      existingShares,
      effectiveFrom: "2024-03-05T00:00:00Z",
      calculationTime: "2024-03-05T08:30:00Z",
    })

    expect(skippedPurchases).toEqual([
      { purchaseId: "jan_cleaning", reason: "before_effective_from" },
      { purchaseId: "feb_detergent", reason: "before_effective_from" },
    ])

    const marchShares = createdShares.filter(
      (share) => share.purchaseId === "mar_detergent",
    )
    expect(marchShares).toHaveLength(3)
    expect(marchShares.map((share) => share.memberId)).toEqual([
      "avery",
      "jordan",
      "priya",
    ])
    expect(marchShares.map((share) => share.amount)).toEqual([12, 12, 12])
    expect(marchShares[0]?.calculatedAt).toBe("2024-03-05T08:30:00.000Z")
    expect(marchShares[0]?.membershipSnapshot).toEqual([
      "avery",
      "jordan",
      "priya",
    ])

    const aprilShares = createdShares.filter(
      (share) => share.purchaseId === "apr_sponges",
    )
    expect(aprilShares).toHaveLength(3)
    expect(aprilShares.map((share) => share.memberId)).toEqual([
      "avery",
      "jordan",
      "priya",
    ])
    expect(aprilShares.map((share) => share.amount)).toEqual([9.34, 9.33, 9.33])
  })

  it("drops departed members for future purchases while preserving history", () => {
    const memberships: HouseholdMembership[] = [
      ...baseMemberships,
      {
        householdId: HOUSEHOLD_ID,
        memberId: "priya",
        joinedAt: "2024-03-05T00:00:00Z",
        leftAt: "2024-07-01T00:00:00Z",
      },
    ]

    const laterPurchases: SupplyPurchase[] = [
      {
        id: "jun_gloves",
        householdId: HOUSEHOLD_ID,
        amount: 18,
        purchasedAt: "2024-06-12T12:00:00Z",
        description: "Gloves and brushes",
      },
      {
        id: "jul_cleaner",
        householdId: HOUSEHOLD_ID,
        amount: 24,
        purchasedAt: "2024-07-12T12:00:00Z",
        description: "All-purpose cleaner",
      },
    ]

    const historicalShares: SupplyShare[] = [
      ...existingShares,
      buildExistingShare(
        "jun_gloves",
        "avery",
        6,
        ["avery", "jordan", "priya"],
        laterPurchases[0].purchasedAt,
      ),
      buildExistingShare(
        "jun_gloves",
        "jordan",
        6,
        ["avery", "jordan", "priya"],
        laterPurchases[0].purchasedAt,
      ),
      buildExistingShare(
        "jun_gloves",
        "priya",
        6,
        ["avery", "jordan", "priya"],
        laterPurchases[0].purchasedAt,
      ),
    ]

    const { createdShares, skippedPurchases } = generateSupplyShares({
      householdId: HOUSEHOLD_ID,
      memberships,
      purchases: laterPurchases,
      existingShares: historicalShares,
      effectiveFrom: "2024-07-01T00:00:00Z",
      calculationTime: "2024-07-01T08:00:00Z",
    })

    expect(skippedPurchases).toEqual([
      { purchaseId: "jun_gloves", reason: "before_effective_from" },
    ])

    expect(createdShares).toHaveLength(2)
    expect(createdShares.map((share) => share.purchaseId)).toEqual([
      "jul_cleaner",
      "jul_cleaner",
    ])
    expect(createdShares.map((share) => share.memberId)).toEqual([
      "avery",
      "jordan",
    ])
    expect(createdShares.map((share) => share.amount)).toEqual([12, 12])
    createdShares.forEach((share) => {
      expect(share.membershipSnapshot).toEqual(["avery", "jordan"])
      expect(share.calculatedAt).toBe("2024-07-01T08:00:00.000Z")
    })
  })
})

describe("handleHouseholdMembershipChange", () => {
  it("detects roster updates and only recalculates future supply shares", async () => {
    const updatedMemberships: HouseholdMembership[] = [
      ...baseMemberships,
      {
        householdId: HOUSEHOLD_ID,
        memberId: "priya",
        joinedAt: "2024-03-05T00:00:00Z",
      },
    ]

    const result = await handleHouseholdMembershipChange({
      householdId: HOUSEHOLD_ID,
      previousMembers: baseMemberships.map((member) => member.memberId),
      nextMembers: [...baseMemberships.map((member) => member.memberId), "priya"],
      memberships: updatedMemberships,
      purchases,
      existingShares,
      effectiveFrom: "2024-03-05T00:00:00Z",
      calculationTime: "2024-03-05T08:30:00Z",
    })

    expect(result.changed).toBe(true)
    expect(result.added).toEqual(["priya"])
    expect(result.removed).toEqual([])
    expect(result.skippedPurchases).toEqual([
      { purchaseId: "jan_cleaning", reason: "before_effective_from" },
      { purchaseId: "feb_detergent", reason: "before_effective_from" },
    ])

    const recalculatedPurchaseIds = Array.from(
      new Set(result.createdShares.map((share) => share.purchaseId)),
    )
    expect(recalculatedPurchaseIds).toEqual(["mar_detergent", "apr_sponges"])

    const aprilShares = result.createdShares.filter(
      (share) => share.purchaseId === "apr_sponges",
    )
    expect(aprilShares.map((share) => share.amount)).toEqual([9.34, 9.33, 9.33])
  })
})
