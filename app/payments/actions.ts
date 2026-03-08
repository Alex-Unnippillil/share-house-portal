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
import type {
  CatchUpCharge,
  CatchUpPaymentInvoiceSettlement,
  CatchUpPaymentSubmissionResult,
} from "@/types/payments"

import { loadCatchUpBalances } from "./loaders"

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

  const catchUpBalances = await loadCatchUpBalances()

  const balance = findCatchUpBalance(catchUpBalances, roommateId)
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

  const groupChargesByInvoice = (
    charges: CatchUpCharge[],
  ): Map<string, { invoiceNumber: string; charges: CatchUpCharge[] }> => {
    const invoiceMap = new Map<
      string,
      { invoiceNumber: string; charges: CatchUpCharge[] }
    >()

    for (const charge of charges) {
      const invoiceId = charge.invoiceId ?? charge.id
      const invoiceNumber = charge.invoiceNumber ?? charge.description
      const current = invoiceMap.get(invoiceId) ?? {
        invoiceNumber,
        charges: [],
      }

      current.charges.push(charge)
      invoiceMap.set(invoiceId, current)
    }

    return invoiceMap
  }

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
      invoiceId: originalCharge?.invoiceId ?? allocation.chargeId,
      invoiceNumber: originalCharge?.invoiceNumber ?? originalCharge?.description ?? "Charge",
      isPropertyManagerAdjustment: Boolean(
        originalCharge?.isPropertyManagerAdjustment,
      ),
    }
  })

  const invoiceGroups = groupChargesByInvoice(balance.charges)
  const updatedChargeMap = new Map(
    updatedCharges.map((charge) => [charge.id, charge] as const),
  )

  const invoiceSettlements: CatchUpPaymentInvoiceSettlement[] = []

  for (const [invoiceId, { invoiceNumber, charges }] of invoiceGroups) {
    const appliedAmount = allocations
      .filter((allocation) =>
        charges.some((charge) => charge.id === allocation.chargeId),
      )
      .reduce((sum, allocation) => sum + allocation.amount, 0)

    if (appliedAmount <= 0) {
      continue
    }

    const previousOutstanding = charges.reduce(
      (sum, charge) => sum + charge.outstandingAmount,
      0,
    )
    const remainingBalance = charges.reduce((sum, charge) => {
      const updatedCharge = updatedChargeMap.get(charge.id)
      return sum + (updatedCharge?.outstandingAmount ?? charge.outstandingAmount)
    }, 0)

    const normalizedPrevious = roundToCurrency(previousOutstanding)
    const normalizedApplied = roundToCurrency(appliedAmount)
    const normalizedRemaining = roundToCurrency(remainingBalance)

    const coveragePercentage =
      normalizedPrevious > 0
        ? Math.min(
            100,
            Math.round((normalizedApplied / normalizedPrevious) * 1000) / 10,
          )
        : 0

    invoiceSettlements.push({
      invoiceId,
      invoiceNumber,
      appliedAmount: normalizedApplied,
      previousOutstanding: normalizedPrevious,
      remainingBalance: normalizedRemaining,
      chargeCount: charges.length,
      coveragePercentage,
      fullyCovered: normalizedRemaining === 0,
    })
  }

  const recipients = [balance.contacts.primary]
  if (includePropertyManager && balance.contacts.propertyManager) {
    recipients.push(balance.contacts.propertyManager)
  }

  const sanitizedNote = note && note.trim().length > 0 ? note.trim() : undefined

  const propertyManagerAdjustments = allocationDetails
    .filter(
      (allocation) =>
        allocation.isPropertyManagerAdjustment && balance.contacts.propertyManager,
    )
    .map((allocation) => ({
      chargeId: allocation.chargeId,
      description: allocation.description,
      amount: allocation.amount,
      remainingBalance: allocation.remainingBalance,
      invoiceNumber: allocation.invoiceNumber,
      manager: balance.contacts.propertyManager!,
    }))

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
    invoiceSettlements,
    propertyManagerAdjustments,
  }
}
