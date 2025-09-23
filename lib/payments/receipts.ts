import { roundToCurrency } from "./currency"
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

export function createPaymentHistoryCsv(
  receipts: PaymentReceiptHistoryEntry[],
): string {
  const headers = [
    "Receipt ID",
    "Issued To",
    "Payment Date",
    "Period Start",
    "Period End",
    "Status",
    "Amount",
    "Currency",
    "Payment Method",
    "Line Items",
    "Memo",
    "Receipt URL",
    "Invoice URL",
    "Tax Document URL",
  ]

  const rows = receipts.map((receipt) => {
    const lineItems = receipt.lineItems
      .map((item) => {
        const formattedAmount = item.totalAmount.toFixed(2)
        return `${item.description} [${item.category}] ${formattedAmount}`
      })
      .join(" | ")

    return [
      receipt.id,
      receipt.issuedTo,
      receipt.paymentDate,
      receipt.periodStart ?? "",
      receipt.periodEnd ?? "",
      receipt.status,
      receipt.amount.toFixed(2),
      receipt.currency,
      receipt.paymentMethod,
      lineItems,
      receipt.memo ?? "",
      receipt.receiptUrl,
      receipt.invoiceUrl ?? "",
      receipt.taxReceiptUrl ?? "",
    ]
  })

  const toCsvRow = (values: string[]) =>
    values
      .map((value) => {
        const sanitized = value.replace(/"/g, '""')
        return `"${sanitized}"`
      })
      .join(",")

  return [headers, ...rows].map((row) => toCsvRow(row)).join("\n")
}
