import { roundToCurrency } from "./currency"
import type {
  PaymentReceiptHistoryEntry,
  PaymentReceiptLineItem,
  PaymentReceiptTaxBreakdown,
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
    "Tax Amount",
    "Tax Rate",
    "Tax Details",
  ]

  const rows = receipts.map((receipt) => {
    const lineItems = receipt.lineItems
      .map((item) => {
        const formattedAmount = item.totalAmount.toFixed(2)
        return `${item.description} [${item.category}] ${formattedAmount}`
      })
      .join(" | ")

    const formattedTaxAmount =
      receipt.taxAmount != null ? receipt.taxAmount.toFixed(2) : ""

    const formattedTaxRate =
      receipt.taxRate != null ? `${(receipt.taxRate * 100).toFixed(2)}%` : ""

    const formattedTaxDetails = formatTaxDetails(receipt.taxDetails)

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
      formattedTaxAmount,
      formattedTaxRate,
      formattedTaxDetails,
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

const formatTaxDetails = (
  details: PaymentReceiptHistoryEntry["taxDetails"],
): string => {
  if (!details) {
    return ""
  }

  if (Array.isArray(details)) {
    const entries = details as PaymentReceiptTaxBreakdown[]
    return entries
      .map((entry) => {
        const parts = [entry.label]
        if (entry.jurisdiction) {
          parts.push(`(${entry.jurisdiction})`)
        }
        if (entry.rate != null) {
          parts.push(`${(entry.rate * 100).toFixed(2)}%`)
        }
        parts.push(entry.amount.toFixed(2))
        return parts.join(" ")
      })
      .join(" | ")
  }

  try {
    return JSON.stringify(details)
  } catch (error) {
    return ""
  }
}
