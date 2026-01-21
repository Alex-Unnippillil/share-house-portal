"use server"

import {
  detectMembershipChanges,
  generateSupplyShares,
  type GenerateSupplySharesParams,
  type GenerateSupplySharesResult,
  type HouseholdMembership,
  type MemberIdentifier,
  type MembershipChangeSummary,
  type SupplyPurchase,
  type SupplyShare,
} from "@/lib/supplies/share-generator"

export interface HandleHouseholdMembershipChangeParams {
  householdId: string
  previousMembers: MemberIdentifier[]
  nextMembers: MemberIdentifier[]
  memberships: HouseholdMembership[]
  purchases: SupplyPurchase[]
  existingShares?: SupplyShare[]
  effectiveFrom: string
  calculationTime?: string
}

export interface HandleHouseholdMembershipChangeResult
  extends MembershipChangeSummary,
    GenerateSupplySharesResult {}

export async function handleHouseholdMembershipChange(
  params: HandleHouseholdMembershipChangeParams,
): Promise<HandleHouseholdMembershipChangeResult> {
  const {
    householdId,
    previousMembers,
    nextMembers,
    memberships,
    purchases,
    existingShares,
    effectiveFrom,
    calculationTime,
  } = params

  const summary = detectMembershipChanges(previousMembers, nextMembers)

  if (!summary.changed) {
    return {
      ...summary,
      createdShares: [],
      skippedPurchases: [],
    }
  }

  const generationParams: GenerateSupplySharesParams = {
    householdId,
    memberships,
    purchases,
    existingShares,
    effectiveFrom,
    calculationTime,
  }

  const { createdShares, skippedPurchases } = generateSupplyShares(
    generationParams,
  )

  return {
    ...summary,
    createdShares,
    skippedPurchases,
  }
}
