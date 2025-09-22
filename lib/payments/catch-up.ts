import type {
  CatchUpBalance,
  CatchUpCharge,
  CatchUpPaymentAllocation,
} from "@/types/payments"

import { roundToCurrency } from "./currency"

export function calculateOutstanding(charges: CatchUpCharge[]): number {
  const totalCents = charges.reduce((sum, charge) => {
    return sum + Math.round(charge.outstandingAmount * 100)
  }, 0)

  return totalCents / 100
}

export function getOutstandingCharges(
  charges: CatchUpCharge[],
): CatchUpCharge[] {
  return charges
    .filter((charge) => roundToCurrency(charge.outstandingAmount) > 0)
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
}

export function getNextOutstandingCharge(
  charges: CatchUpCharge[],
): CatchUpCharge | undefined {
  return getOutstandingCharges(charges)[0]
}

export function allocatePaymentToCharges(
  charges: CatchUpCharge[],
  amount: number,
): CatchUpPaymentAllocation[] {
  const outstandingCharges = getOutstandingCharges(charges)
  let remainingCents = Math.round(amount * 100)
  const allocations: CatchUpPaymentAllocation[] = []

  for (const charge of outstandingCharges) {
    if (remainingCents <= 0) {
      break
    }

    const chargeCents = Math.round(charge.outstandingAmount * 100)
    if (chargeCents <= 0) {
      continue
    }

    const appliedCents = Math.min(chargeCents, remainingCents)
    if (appliedCents > 0) {
      allocations.push({ chargeId: charge.id, amount: appliedCents / 100 })
      remainingCents -= appliedCents
    }
  }

  if (remainingCents > 0) {
    throw new Error("Catch-up amount exceeds outstanding charges.")
  }

  return allocations
}

export function applyAllocationsToCharges(
  charges: CatchUpCharge[],
  allocations: CatchUpPaymentAllocation[],
): CatchUpCharge[] {
  return charges.map((charge) => {
    const allocationTotal = allocations
      .filter((allocation) => allocation.chargeId === charge.id)
      .reduce((sum, allocation) => sum + allocation.amount, 0)

    const remaining = Math.max(
      0,
      roundToCurrency(charge.outstandingAmount - allocationTotal),
    )

    return {
      ...charge,
      outstandingAmount: remaining,
    }
  })
}

export function findCatchUpBalance(
  balances: CatchUpBalance[],
  roommateId: string,
): CatchUpBalance | undefined {
  return balances.find((balance) => balance.roommateId === roommateId)
}

export function generateMockPaymentIntentId(): string {
  const globalCrypto = globalThis.crypto
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `pi_${globalCrypto.randomUUID().replace(/-/g, "").slice(0, 24)}`
  }

  return `pi_${Math.random().toString(36).slice(2, 26)}`
}

export function formatAutopayDay(day: number): string {
  const remainder = day % 10
  const remainderHundreds = day % 100

  if (remainder === 1 && remainderHundreds !== 11) {
    return `${day}st`
  }

  if (remainder === 2 && remainderHundreds !== 12) {
    return `${day}nd`
  }

  if (remainder === 3 && remainderHundreds !== 13) {
    return `${day}rd`
  }

  return `${day}th`
}
