import type { Database } from "@/lib/supabase"

export type FinanceRevenueRow = Database["public"]["Views"]["finance_revenue_summary"]["Row"]

export type FinanceRevenueLine = {
  invoiceId: string
  lineItemId: string
  customerId: string | null
  customerEmail: string | null
  subscriptionId: string | null
  invoiceStatus: string | null
  totalAmountCents: number
  recognizedAmountCents: number
  deferredAmountCents: number
  currency: string
  periodStart: string | null
  periodEnd: string | null
  calculationTime: string | null
}

export type RevenueAggregate = {
  totalRecognizedCents: number
  totalDeferredCents: number
  totalAmountCents: number
}

export type CurrencyRevenueSummary = RevenueAggregate & {
  currency: string
  recognizedShare: number
}

export type ReconciliationIssue = {
  line: FinanceRevenueLine
  differenceCents: number
}

const CENTS_SCALE = 100

function coerceCurrency(currency: string | null | undefined): string {
  return (currency ?? "USD").toUpperCase()
}

function coerceNumber(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  return 0
}

export function normalizeFinanceRevenueRow(row: FinanceRevenueRow): FinanceRevenueLine {
  return {
    invoiceId: row.invoice_id ?? "",
    lineItemId: row.line_item_id ?? "",
    customerId: row.customer_id ?? null,
    customerEmail: row.customer_email ?? null,
    subscriptionId: row.subscription_id ?? null,
    invoiceStatus: row.invoice_status ?? null,
    totalAmountCents: coerceNumber(row.total_amount_cents),
    recognizedAmountCents: coerceNumber(row.recognized_amount_cents),
    deferredAmountCents: coerceNumber(row.deferred_amount_cents),
    currency: coerceCurrency(row.currency),
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
    calculationTime: row.calculation_time ?? null,
  }
}

export function summarizeRevenue(lines: FinanceRevenueLine[]): RevenueAggregate {
  return lines.reduce<RevenueAggregate>(
    (acc, line) => ({
      totalRecognizedCents: acc.totalRecognizedCents + line.recognizedAmountCents,
      totalDeferredCents: acc.totalDeferredCents + line.deferredAmountCents,
      totalAmountCents: acc.totalAmountCents + line.totalAmountCents,
    }),
    { totalRecognizedCents: 0, totalDeferredCents: 0, totalAmountCents: 0 },
  )
}

export function summarizeRevenueByCurrency(lines: FinanceRevenueLine[]): CurrencyRevenueSummary[] {
  const grouped = new Map<string, RevenueAggregate>()

  for (const line of lines) {
    const key = line.currency
    const current = grouped.get(key) ?? {
      totalRecognizedCents: 0,
      totalDeferredCents: 0,
      totalAmountCents: 0,
    }
    grouped.set(key, {
      totalRecognizedCents: current.totalRecognizedCents + line.recognizedAmountCents,
      totalDeferredCents: current.totalDeferredCents + line.deferredAmountCents,
      totalAmountCents: current.totalAmountCents + line.totalAmountCents,
    })
  }

  return Array.from(grouped.entries()).map(([currency, aggregate]) => {
    const total = aggregate.totalAmountCents || 1
    const share = aggregate.totalRecognizedCents / total
    return {
      currency,
      totalRecognizedCents: aggregate.totalRecognizedCents,
      totalDeferredCents: aggregate.totalDeferredCents,
      totalAmountCents: aggregate.totalAmountCents,
      recognizedShare: Math.min(Math.max(share, 0), 1),
    }
  })
}

export function findReconciliationIssues(lines: FinanceRevenueLine[]): ReconciliationIssue[] {
  return lines
    .map((line) => {
      const difference = line.totalAmountCents - (line.recognizedAmountCents + line.deferredAmountCents)
      return { line, differenceCents: difference }
    })
    .filter((entry) => Math.abs(entry.differenceCents) > 1)
}

function escapeCsv(value: string | number | null): string {
  if (value === null) {
    return ""
  }
  const stringValue = typeof value === "number" ? value.toString() : value
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function centsToCurrency(value: number): string {
  return (value / CENTS_SCALE).toFixed(2)
}

export function buildRevenueCsv(lines: FinanceRevenueLine[]): string {
  const header = [
    "invoice_id",
    "line_item_id",
    "customer_id",
    "customer_email",
    "subscription_id",
    "invoice_status",
    "currency",
    "total_amount",
    "recognized_amount",
    "deferred_amount",
    "period_start",
    "period_end",
    "calculation_time",
  ]

  const rows = lines.map((line) => [
    line.invoiceId,
    line.lineItemId,
    line.customerId,
    line.customerEmail,
    line.subscriptionId,
    line.invoiceStatus,
    line.currency,
    centsToCurrency(line.totalAmountCents),
    centsToCurrency(line.recognizedAmountCents),
    centsToCurrency(line.deferredAmountCents),
    line.periodStart,
    line.periodEnd,
    line.calculationTime,
  ])

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsv(value ?? null)).join(","))
    .join("\n")
}

export function formatCentsAsCurrency(amountCents: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return formatter.format(amountCents / CENTS_SCALE)
}
