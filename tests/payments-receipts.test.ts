import { describe, expect, it } from "vitest"

import { createPaymentHistoryCsv } from "@/lib/payments/receipts"
import type { PaymentReceiptHistoryEntry } from "@/types/payments"

describe("payment receipts exports", () => {
  it("includes tax document download URLs in the CSV export", () => {
    const receipts: PaymentReceiptHistoryEntry[] = [
      {
        id: "rcpt_test",
        issuedTo: "Test Tenant",
        paymentDate: "2024-01-01",
        currency: "USD",
        amount: 1260,
        status: "paid",
        paymentMethod: "Visa",
        receiptUrl: "https://example.com/receipt.pdf",
        taxReceiptUrl: "https://example.com/tax.pdf",
        lineItems: [
          {
            id: "line-1",
            description: "Rent",
            category: "rent",
            totalAmount: 1260,
          },
        ],
      },
    ]

    const csv = createPaymentHistoryCsv(receipts)
    const [header, row] = csv.split("\n")

    expect(header).toContain("Tax Document URL")
    expect(row).toContain("https://example.com/tax.pdf")
  })
})
