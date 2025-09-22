import type { Database } from "@/lib/supabase"

export type SupplySplitMode = Database["public"]["Enums"]["supply_split_mode"]
export type HouseholdRow = Database["public"]["Tables"]["households"]["Row"]
export type HouseholdMembershipRow = Database["public"]["Tables"]["household_memberships"]["Row"]
export type SupplyPurchaseRow = Database["public"]["Tables"]["supply_purchases"]["Row"]

export interface PurchaseShare {
  membershipId: string
  profileId: string
  amount: number
  weightingFactor: number
  percentage: number
}

export interface PurchaseShareCalculation {
  mode: SupplySplitMode
  total: number
  shares: PurchaseShare[]
}

interface CalculationOptions {
  overrideMode?: SupplySplitMode
}

export function calculatePurchaseShares(
  purchase: SupplyPurchaseRow,
  memberships: HouseholdMembershipRow[],
  options: CalculationOptions = {}
): PurchaseShareCalculation {
  const applicableMemberships = memberships.filter(
    (membership) => membership.household_id === purchase.household_id
  )

  if (applicableMemberships.length === 0 || !isFiniteNumber(purchase.total_cost)) {
    return { mode: purchase.default_split, total: roundCurrency(purchase.total_cost), shares: [] }
  }

  const requestedMode = options.overrideMode ?? purchase.default_split
  const sanitizedWeights = applicableMemberships.map((membership) =>
    Math.max(0, coerceNumber(membership.weighting_factor, 1))
  )

  const baseTotal = roundCurrency(purchase.total_cost)

  if (requestedMode === "weighted") {
    const weightSum = sanitizedWeights.reduce((accumulator, weight) => accumulator + weight, 0)

    if (weightSum <= 0) {
      return distributeEvenly(applicableMemberships, baseTotal)
    }

    const rawShares = sanitizedWeights.map((weight) => (baseTotal * weight) / weightSum)
    return finalizeCalculation(applicableMemberships, rawShares, baseTotal, "weighted")
  }

  const rawShares = new Array(applicableMemberships.length).fill(baseTotal / applicableMemberships.length)
  return finalizeCalculation(applicableMemberships, rawShares, baseTotal, "even")
}

function finalizeCalculation(
  memberships: HouseholdMembershipRow[],
  rawShares: number[],
  total: number,
  intendedMode: SupplySplitMode
): PurchaseShareCalculation {
  const roundedShares = rawShares.map((share) => roundCurrency(share))
  const roundedSum = roundedShares.reduce((accumulator, share) => accumulator + share, 0)
  const roundingDelta = roundCurrency(total - roundedSum)

  if (roundingDelta !== 0) {
    const shareIndex = indexOfLargest(rawShares)
    roundedShares[shareIndex] = roundCurrency(roundedShares[shareIndex] + roundingDelta)
  }

  const resultShares: PurchaseShare[] = memberships.map((membership, index) => {
    const rawShare = rawShares[index]
    const roundedShare = roundedShares[index]
    const percentage = total > 0 ? rawShare / total : 0

    return {
      membershipId: membership.id,
      profileId: membership.profile_id,
      amount: roundedShare,
      weightingFactor: coerceNumber(membership.weighting_factor, 1),
      percentage,
    }
  })

  return {
    mode: intendedMode,
    total,
    shares: resultShares,
  }
}

function distributeEvenly(
  memberships: HouseholdMembershipRow[],
  total: number
): PurchaseShareCalculation {
  if (memberships.length === 0) {
    return { mode: "even", total, shares: [] }
  }

  const evenShare = total / memberships.length
  const rawShares = memberships.map(() => evenShare)
  return finalizeCalculation(memberships, rawShares, total, "even")
}

function roundCurrency(value: number): number {
  const amount = coerceNumber(value, 0)
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function indexOfLargest(values: number[]): number {
  let index = 0
  let largest = Number.NEGATIVE_INFINITY

  values.forEach((value, currentIndex) => {
    if (value > largest) {
      largest = value
      index = currentIndex
    }
  })

  return index
}

function coerceNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
