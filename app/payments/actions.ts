"use server"

import { z } from "zod"

import {
  allocatePaymentToCharges,
  applyAllocationsToCharges,
  calculateOutstanding,
  findCatchUpBalance,
  generateMockPaymentIntentId,
} from "@/lib/payments/catch-up"
import { formatCurrency, roundToCurrency } from "@/lib/payments/currency"
import type { CatchUpPaymentSubmissionResult } from "@/types/payments"
import { loadCatchUpOverview } from "./loaders"

const catchUpPaymentActionSchema = z.object({
  roommateId: z.string().min(1),
  amount: z.number().positive(),
  includePropertyManager: z.boolean().optional(),
  note: z.string().trim().max(280).optional(),
})

export async function submitCatchUpPayment(
  input: z.infer<typeof catchUpPaymentActionSchema>,
): Promise<CatchUpPaymentSubmissionResult> {
  const parsed = catchUpPaymentActionSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid catch-up payment request."
    throw new Error(message)
  }

  const {
    roommateId,
    amount,
    includePropertyManager = false,
    note,
  } = parsed.data

  const { balances } = await loadCatchUpOverview()
  const balance = findCatchUpBalance(balances, roommateId)
  if (!balance) {
    throw new Error("Selected roommate is not available for catch-up payments.")
  }

  const outstanding = calculateOutstanding(balance.charges)
  if (amount > outstanding) {
    throw new Error(
      `Catch-up amount exceeds outstanding balance of ${formatCurrency(outstanding, balance.currency)}.`,
    )
  }

  const allocations = allocatePaymentToCharges(balance.charges, amount)
  if (allocations.length === 0) {
    throw new Error("There are no outstanding charges to apply this payment to.")
  }
  const updatedCharges = applyAllocationsToCharges(balance.charges, allocations)
  const projectedBalance = roundToCurrency(
    calculateOutstanding(updatedCharges),
  )

  const allocationDetails = allocations.map((allocation) => {
    const originalCharge = balance.charges.find(
      (charge) => charge.id === allocation.chargeId,
    )
    const updatedCharge = updatedCharges.find(
      (charge) => charge.id === allocation.chargeId,
    )

    return {
      chargeId: allocation.chargeId,
      amount: roundToCurrency(allocation.amount),
      description: originalCharge?.description ?? "Charge",
      category: originalCharge?.category ?? "other",
      dueDate:
        originalCharge?.dueDate ?? new Date().toISOString().slice(0, 10),
      remainingBalance: roundToCurrency(
        updatedCharge?.outstandingAmount ?? 0,
      ),
    }
  })

  const recipients = [balance.contacts.primary]
  if (includePropertyManager && balance.contacts.propertyManager) {
    recipients.push(balance.contacts.propertyManager)
  }

  const sanitizedNote = note && note.trim().length > 0 ? note.trim() : undefined

  return {
    paymentIntentId: generateMockPaymentIntentId(),
    roommateId: balance.roommateId,
    roommateName: balance.roommateName,
    amount: roundToCurrency(amount),
    currency: balance.currency,
    projectedBalance,
    allocations: allocationDetails,
    recipients,
    autopayStatus: balance.autopayStatus,
    autopayDay: balance.autopayDay,
    note: sanitizedNote,
  }
}
