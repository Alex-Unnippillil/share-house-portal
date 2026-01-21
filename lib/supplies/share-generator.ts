// Utilities for calculating supply cost shares across household members.
// The generator is intentionally pure so it can be reused from server actions
// and unit tests without touching the database.

export interface HouseholdMembership {
  householdId: string
  memberId: string
  joinedAt: string
  leftAt?: string | null
}

export interface SupplyPurchase {
  id: string
  householdId: string
  purchasedAt: string
  amount: number
  description?: string
}

export interface SupplyShare {
  purchaseId: string
  memberId: string
  householdId: string
  amount: number
  calculatedAt: string
  membershipSnapshot: string[]
  purchaseDate: string
}

export type SkipReason =
  | "household_mismatch"
  | "before_effective_from"
  | "existing_share"
  | "no_active_members"

export interface SkippedPurchase {
  purchaseId: string
  reason: SkipReason
}

export interface GenerateSupplySharesParams {
  householdId: string
  purchases: SupplyPurchase[]
  memberships: HouseholdMembership[]
  existingShares?: SupplyShare[]
  effectiveFrom?: string
  calculationTime?: string
}

export interface GenerateSupplySharesResult {
  createdShares: SupplyShare[]
  skippedPurchases: SkippedPurchase[]
}

export type MemberIdentifier = string | Pick<HouseholdMembership, "memberId">

export interface MembershipChangeSummary {
  added: string[]
  removed: string[]
  unchanged: string[]
  changed: boolean
}

interface NormalizedMembership extends HouseholdMembership {
  joinedAtTs: number
  leftAtTs: number | null
}

interface NormalizedPurchase extends SupplyPurchase {
  purchasedAtTs: number
}

function toTimestamp(value: string, label: string): number {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) {
    throw new Error(`Invalid ${label} value "${value}"`)
  }
  return time
}

function normalizeCalculationTime(value?: string): string {
  if (!value) {
    return new Date().toISOString()
  }
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid calculation time "${value}"`)
  }
  return instant.toISOString()
}

function normalizeMemberships(
  memberships: HouseholdMembership[],
  householdId: string,
): NormalizedMembership[] {
  return memberships
    .filter((membership) => membership.householdId === householdId)
    .map<NormalizedMembership>((membership) => ({
      ...membership,
      joinedAtTs: toTimestamp(membership.joinedAt, "joinedAt"),
      leftAtTs:
        membership.leftAt === undefined || membership.leftAt === null
          ? null
          : toTimestamp(membership.leftAt, "leftAt"),
    }))
    .sort((a, b) => {
      if (a.joinedAtTs === b.joinedAtTs) {
        return a.memberId.localeCompare(b.memberId)
      }
      return a.joinedAtTs - b.joinedAtTs
    })
}

function normalizePurchases(purchases: SupplyPurchase[]): NormalizedPurchase[] {
  return [...purchases].map<NormalizedPurchase>((purchase) => ({
    ...purchase,
    purchasedAtTs: toTimestamp(purchase.purchasedAt, "purchasedAt"),
  }))
}

function getActiveMembers(
  memberships: NormalizedMembership[],
  timestamp: number,
): NormalizedMembership[] {
  return memberships.filter((membership) => {
    const started = membership.joinedAtTs <= timestamp
    const notLeft =
      membership.leftAtTs === null || timestamp < membership.leftAtTs
    return started && notLeft
  })
}

function allocateEvenly(amount: number, count: number): number[] {
  if (count <= 0) {
    return []
  }
  const totalCents = Math.round(amount * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0)
    return Number((cents / 100).toFixed(2))
  })
}

function createSnapshot(members: NormalizedMembership[]): string[] {
  return members.map((member) => member.memberId)
}

function toMemberId(identifier: MemberIdentifier): string {
  return typeof identifier === "string" ? identifier : identifier.memberId
}

export function detectMembershipChanges(
  previous: MemberIdentifier[],
  next: MemberIdentifier[],
): MembershipChangeSummary {
  const previousIds = new Set(previous.map(toMemberId))
  const nextIds = new Set(next.map(toMemberId))

  const added: string[] = []
  const removed: string[] = []
  const unchanged: string[] = []

  for (const id of next.map(toMemberId)) {
    if (!previousIds.has(id)) {
      if (!added.includes(id)) {
        added.push(id)
      }
    } else if (!unchanged.includes(id)) {
      unchanged.push(id)
    }
  }

  for (const id of previous.map(toMemberId)) {
    if (!nextIds.has(id) && !removed.includes(id)) {
      removed.push(id)
    }
  }

  return {
    added,
    removed,
    unchanged,
    changed: added.length > 0 || removed.length > 0,
  }
}

export function generateSupplyShares({
  householdId,
  purchases,
  memberships,
  existingShares = [],
  effectiveFrom,
  calculationTime,
}: GenerateSupplySharesParams): GenerateSupplySharesResult {
  if (!householdId) {
    throw new Error("householdId is required to generate supply shares")
  }

  const normalizedMemberships = normalizeMemberships(memberships, householdId)
  const normalizedPurchases = normalizePurchases(purchases)
  const effectiveFromTs =
    effectiveFrom === undefined
      ? Number.NEGATIVE_INFINITY
      : toTimestamp(effectiveFrom, "effectiveFrom")
  const calculatedAt = normalizeCalculationTime(calculationTime)

  const existingPurchaseIds = new Set(
    existingShares
      .filter((share) => share.householdId === householdId)
      .map((share) => share.purchaseId),
  )

  const createdShares: SupplyShare[] = []
  const skippedPurchases: SkippedPurchase[] = []

  for (const purchase of normalizedPurchases.sort(
    (a, b) => a.purchasedAtTs - b.purchasedAtTs,
  )) {
    if (purchase.householdId !== householdId) {
      skippedPurchases.push({
        purchaseId: purchase.id,
        reason: "household_mismatch",
      })
      continue
    }

    if (purchase.purchasedAtTs < effectiveFromTs) {
      skippedPurchases.push({
        purchaseId: purchase.id,
        reason: "before_effective_from",
      })
      continue
    }

    if (existingPurchaseIds.has(purchase.id)) {
      skippedPurchases.push({
        purchaseId: purchase.id,
        reason: "existing_share",
      })
      continue
    }

    const activeMembers = getActiveMembers(
      normalizedMemberships,
      purchase.purchasedAtTs,
    )

    if (activeMembers.length === 0) {
      skippedPurchases.push({
        purchaseId: purchase.id,
        reason: "no_active_members",
      })
      continue
    }

    const snapshot = createSnapshot(activeMembers)
    const allocations = allocateEvenly(purchase.amount, activeMembers.length)

    allocations.forEach((shareAmount, index) => {
      createdShares.push({
        purchaseId: purchase.id,
        memberId: activeMembers[index].memberId,
        householdId,
        amount: shareAmount,
        calculatedAt,
        membershipSnapshot: [...snapshot],
        purchaseDate: purchase.purchasedAt,
      })
    })
  }

  return { createdShares, skippedPurchases }
}
