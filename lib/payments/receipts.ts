import { format, parseISO } from "date-fns"

import { buildCsvString } from "@/lib/export/csv"
import { formatCurrency, roundToCurrency } from "./currency"
import type {
  PaymentReceiptHistoryEntry,
  PaymentReceiptLineItem,
} from "@/types/payments"

const reimbursableCategories: PaymentReceiptLineItem["category"][] = [
  "utilities",
  "fees",
  "maintenance",
]

export interface ReceiptHistorySummary {
  yearToDateAmount: number
  reimbursableLineItems: number
  lastReceiptDate: string | null
}

export function summarizeReceiptHistory(
  receipts: PaymentReceiptHistoryEntry[],
): ReceiptHistorySummary {
  const currentYear = new Date().getFullYear()

  let yearToDateAmount = 0
  let reimbursableLineItems = 0
  let lastReceiptDate: Date | null = null

  for (const receipt of receipts) {
    const paymentDate = new Date(receipt.paymentDate)

    if (!Number.isNaN(paymentDate.getTime())) {
      if (!lastReceiptDate || paymentDate > lastReceiptDate) {
        lastReceiptDate = paymentDate
      }

      if (paymentDate.getFullYear() === currentYear && receipt.status === "paid") {
        yearToDateAmount += receipt.amount
      }
    }

    reimbursableLineItems += receipt.lineItems.filter((item) =>
      reimbursableCategories.includes(item.category),
    ).length
  }

  return {
    yearToDateAmount: roundToCurrency(yearToDateAmount),
    reimbursableLineItems,
    lastReceiptDate: lastReceiptDate ? lastReceiptDate.toISOString() : null,
  }
}

export function formatReceiptPeriod(
  periodStart: string | undefined,
  periodEnd: string | undefined,
): string {
  if (!periodStart && !periodEnd) {
    return "—"
  }

  if (periodStart && periodEnd) {
    try {
      const start = format(parseISO(periodStart), "MMM d")
      const end = format(parseISO(periodEnd), "MMM d, yyyy")
      return `${start} – ${end}`
    } catch {
      return `${periodStart} – ${periodEnd}`
    }
  }

  const singleDate = periodStart ?? periodEnd
  if (!singleDate) {
    return "—"
  }

  try {
    return format(parseISO(singleDate), "MMM d, yyyy")
  } catch {
    return singleDate
  }
}

const statusLabels: Record<PaymentReceiptHistoryEntry["status"], string> = {
  paid: "Paid",
  processing: "Processing",
  refunded: "Refunded",
}

export function createPaymentHistoryCsv(
  receipts: PaymentReceiptHistoryEntry[],
): string {
  const headers = [
    "Payment",
    "Period",
    "Line items",
    "Amount",
    "Status",
    "Actions",
  ]

  const rows = receipts.map((receipt) => {
    const paymentDate = (() => {
      try {
        return format(parseISO(receipt.paymentDate), "MMM d, yyyy")
      } catch {
        return receipt.paymentDate
      }
    })()

    const paymentDetails = [
      receipt.issuedTo,
      paymentDate
        ? `${paymentDate}${receipt.paymentMethod ? ` · ${receipt.paymentMethod}` : ""}`
        : receipt.paymentMethod,
    ]

    if (receipt.memo) {
      paymentDetails.push(receipt.memo)
    }

    const lineItems = receipt.lineItems.map((item) => {
      const amount = formatCurrency(item.totalAmount, receipt.currency)
      return `${item.description} — ${amount}`
    })

    const amountCell = receipt.amount < 0
      ? `${formatCurrency(receipt.amount, receipt.currency)}\nCredit issued`
      : formatCurrency(receipt.amount, receipt.currency)

    const actions = [
      `Receipt: ${receipt.receiptUrl}`,
      receipt.invoiceUrl ? `Invoice: ${receipt.invoiceUrl}` : null,
    ].filter(Boolean) as string[]

    return [
      paymentDetails.filter(Boolean).join("\n"),
      formatReceiptPeriod(receipt.periodStart, receipt.periodEnd),
      lineItems.join("\n"),
      amountCell,
      statusLabels[receipt.status],
      actions.join("\n"),
    ]
  })

  return buildCsvString(headers, rows)
}
