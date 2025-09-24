import { describe, expect, it } from "vitest"

import {
  buildRevenueCsv,
  findReconciliationIssues,
  formatCentsAsCurrency,
  normalizeFinanceRevenueRow,
  summarizeRevenue,
  summarizeRevenueByCurrency,
  type FinanceRevenueLine,
} from "@/lib/finance/revenue"

describe("finance revenue utilities", () => {
  const baseLine: FinanceRevenueLine = {
    invoiceId: "in_test",
    lineItemId: "li_test",
    customerId: "cus_123",
    customerEmail: "tenant@example.com",
    subscriptionId: "sub_123",
    invoiceStatus: "paid",
    totalAmountCents: 10000,
    recognizedAmountCents: 4000,
    deferredAmountCents: 6000,
    currency: "USD",
    periodStart: "2024-01-01T00:00:00Z",
    periodEnd: "2024-01-31T00:00:00Z",
    calculationTime: "2024-01-15T00:00:00Z",
  }

  it("normalizes database rows with sensible defaults", () => {
    const normalized = normalizeFinanceRevenueRow({
      invoice_id: null,
      line_item_id: null,
      customer_id: null,
      customer_email: null,
      subscription_id: null,
      invoice_status: null,
      total_amount_cents: null,
      recognized_amount_cents: null,
      deferred_amount_cents: null,
      currency: null,
      period_start: null,
      period_end: null,
      calculation_time: null,
    })

    expect(normalized.invoiceId).toBe("")
    expect(normalized.currency).toBe("USD")
    expect(normalized.totalAmountCents).toBe(0)
  })

  it("aggregates totals and currency mix", () => {
    const lines: FinanceRevenueLine[] = [
      baseLine,
      { ...baseLine, lineItemId: "li_2", totalAmountCents: 5000, recognizedAmountCents: 2500, deferredAmountCents: 2500 },
      { ...baseLine, lineItemId: "li_3", currency: "EUR", totalAmountCents: 2000, recognizedAmountCents: 1000, deferredAmountCents: 1000 },
    ]

    const overall = summarizeRevenue(lines)
    expect(overall.totalAmountCents).toBe(17000)
    expect(overall.totalRecognizedCents).toBe(7500)
    expect(overall.totalDeferredCents).toBe(9500)

    const byCurrency = summarizeRevenueByCurrency(lines)
    const usd = byCurrency.find((entry) => entry.currency === "USD")
    expect(usd).toBeDefined()
    expect(usd?.totalAmountCents).toBe(15000)
    expect(usd?.recognizedShare).toBeCloseTo(0.433, 2)
  })

  it("flags reconciliation differences greater than one cent", () => {
    const lines: FinanceRevenueLine[] = [
      baseLine,
      { ...baseLine, lineItemId: "li_diff", totalAmountCents: 1000, recognizedAmountCents: 998, deferredAmountCents: 0 },
    ]

    const issues = findReconciliationIssues(lines)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.line.lineItemId).toBe("li_diff")
    expect(issues[0]?.differenceCents).toBe(2)
  })

  it("builds csv output with headers", () => {
    const csv = buildRevenueCsv([baseLine])
    const [header, row] = csv.split("\n")
    expect(header.split(",")[0]).toBe("invoice_id")
    expect(row).toContain("in_test")
    expect(row).toContain("100.00")
  })

  it("formats cents as localized currency", () => {
    expect(formatCentsAsCurrency(12345, "USD")).toBe("$123.45")
    expect(formatCentsAsCurrency(12345, "EUR")).toContain("123.45")
  })
})
