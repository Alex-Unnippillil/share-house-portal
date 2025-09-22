export const SUPPORTED_PAYMENT_METHODS = ["card", "acss_debit"] as const

export type PaymentMethodType = (typeof SUPPORTED_PAYMENT_METHODS)[number]

export type PaymentIntentStatus =
  | "canceled"
  | "processing"
  | "requires_action"
  | "requires_capture"
  | "requires_confirmation"
  | "requires_payment_method"
  | "succeeded"

export function toMinorUnitAmount(amount: string): number {
  const sanitized = amount.replace(/[^0-9.,]/g, "").replace(/,/g, ".")
  if (!sanitized) {
    return 0
  }

  const parsed = Number.parseFloat(sanitized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid amount provided")
  }

  return Math.round(parsed * 100)
}

export function fromMinorUnitAmount(amount: number): string {
  return (amount / 100).toFixed(2)
}

export function resolveInvoiceStatus(
  paymentStatus: PaymentIntentStatus,
  currentAmountDue: number,
  paymentAmount: number
) {
  let nextStatus: string = "open"
  let remainingAmount = currentAmountDue

  switch (paymentStatus) {
    case "succeeded": {
      remainingAmount = Math.max(currentAmountDue - paymentAmount, 0)
      nextStatus = remainingAmount === 0 ? "paid" : "partial"
      break
    }
    case "processing": {
      nextStatus = "processing"
      break
    }
    case "requires_action":
    case "requires_capture":
    case "requires_confirmation": {
      nextStatus = "pending"
      break
    }
    case "canceled":
    case "requires_payment_method": {
      nextStatus = "open"
      break
    }
    default: {
      nextStatus = "open"
    }
  }

  return {
    nextStatus,
    remainingAmount,
  }
}

export function getPaymentMethodCopy(method: PaymentMethodType) {
  if (method === "acss_debit") {
    return {
      title: "Pre-authorized debit",
      description:
        "Authorize a one-time withdrawal from your Canadian bank account. Confirmation may take 3 business days.",
    }
  }

  return {
    title: "Credit or debit card",
    description:
      "Pay instantly with Visa, Mastercard, or AMEX. Your card details stay with Stripe and never touch our servers.",
  }
}
