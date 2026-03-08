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
  documentationCount: number
  noteCount: number
}

export function summarizeReceiptHistory(
  receipts: PaymentReceiptHistoryEntry[],
): ReceiptHistorySummary {
  const currentYear = new Date().getFullYear()

  let yearToDateAmount = 0
  let reimbursableLineItems = 0
  let lastReceiptDate: Date | null = null
  let documentationCount = 0
  let noteCount = 0

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

    for (const attachment of receipt.attachments ?? []) {
      if (attachment.type === "note") {
        noteCount += 1
      } else {
        documentationCount += 1
      }
    }
  }

  return {
    yearToDateAmount: roundToCurrency(yearToDateAmount),
    reimbursableLineItems,
    lastReceiptDate: lastReceiptDate ? lastReceiptDate.toISOString() : null,
    documentationCount,
    noteCount,
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
    "Attachments",
    "Memo",
    "Receipt URL",
    "Invoice URL",
  ]

  const rows = receipts.map((receipt) => {
    const lineItems = receipt.lineItems
      .map((item) => {
        const formattedAmount = item.totalAmount.toFixed(2)
        return `${item.description} [${item.category}] ${formattedAmount}`
      })
      .join(" | ")

    const attachments = (receipt.attachments ?? [])
      .map((attachment) => {
        const details = [
          `${attachment.type.toUpperCase()}: ${attachment.label}`,
          attachment.url ? `URL: ${attachment.url}` : undefined,
          attachment.description,
        ].filter(Boolean)
        return details.join(" · ")
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
      attachments,
      receipt.memo ?? "",
      receipt.receiptUrl,
      receipt.invoiceUrl ?? "",
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
