"use server"

import { z } from "zod"

import { roundToCurrency } from "@/lib/payments/currency"
import { sharedLedgerEntries } from "@/lib/supplies/ledger-data"
import { formatLedgerMonth } from "@/lib/supplies/ledger-utils"

const exportLedgerInputSchema = z.object({
  month: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}$/u, "Select a valid month in YYYY-MM format."),
  timeZone: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value })
        return true
      } catch (error) {
        return false
      }
    }, "Provide a valid time zone."),
})

export type ExportLedgerInput = z.infer<typeof exportLedgerInputSchema>

export interface ExportLedgerResult {
  fileName: string
  csv: string
  entryCount: number
  purchaseCount: number
  monthLabel: string
}

export async function exportLedgerCsv(
  input: ExportLedgerInput,
): Promise<ExportLedgerResult> {
  const parsed = exportLedgerInputSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid export request."
    throw new Error(message)
  }

  const { month, timeZone } = parsed.data

  const { start, end } = getMonthDateRange(month, timeZone)

  const filtered = sharedLedgerEntries
    .filter((entry) => {
      const timestamp = new Date(entry.purchasedAt).getTime()
      return timestamp >= start.getTime() && timestamp < end.getTime()
    })
    .sort(
      (a, b) =>
        new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime(),
    )

  const rows: string[][] = []
  for (const purchase of filtered) {
    const localPurchaseDate = formatDateInTimeZone(
      new Date(purchase.purchasedAt),
      timeZone,
    )

    for (const share of purchase.shares) {
      const shareAmount = roundToCurrency(share.amount).toFixed(2)
      const sharePercent = formatPercentage(
        purchase.totalAmount,
        share.amount,
      )

      rows.push([
        localPurchaseDate,
        purchase.description,
        purchase.category,
        purchase.merchant,
        purchase.paidBy.name,
        roundToCurrency(purchase.totalAmount).toFixed(2),
        purchase.currency,
        share.roommateName,
        shareAmount,
        sharePercent,
        purchase.note ?? "",
      ])
    }
  }

  const csv = buildCsv([
    [
      "Purchase date",
      "Description",
      "Category",
      "Merchant",
      "Paid by",
      "Total amount",
      "Currency",
      "Share owner",
      "Share amount",
      "Share %",
      "Notes",
    ],
    ...rows,
  ])

  return {
    fileName: `shared-ledger-${month}.csv`,
    csv,
    entryCount: rows.length,
    purchaseCount: filtered.length,
    monthLabel: formatLedgerMonth(month),
  }
}

function getMonthDateRange(month: string, timeZone: string) {
  const [yearStr, monthStr] = month.split("-")
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error("Select a valid month in YYYY-MM format.")
  }

  const startUtc = Date.UTC(year, monthIndex, 1, 0, 0, 0)
  const startOffsetMinutes = getTimeZoneOffsetMinutes(
    new Date(startUtc),
    timeZone,
  )
  const start = new Date(startUtc - startOffsetMinutes * 60_000)

  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1
  const nextMonthYear = monthIndex === 11 ? year + 1 : year
  const endUtc = Date.UTC(nextMonthYear, nextMonthIndex, 1, 0, 0, 0)
  const endOffsetMinutes = getTimeZoneOffsetMinutes(
    new Date(endUtc),
    timeZone,
  )
  const end = new Date(endUtc - endOffsetMinutes * 60_000)

  return { start, end }
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const zonedString = date.toLocaleString("en-US", { timeZone })
  const zonedDate = new Date(zonedString)
  return (zonedDate.getTime() - date.getTime()) / 60_000
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function formatPercentage(total: number, portion: number): string {
  if (total <= 0) {
    return "0.00%"
  }

  const ratio = Math.max(0, portion) / total
  const asPercent = Math.round(ratio * 10_000) / 100
  return `${asPercent.toFixed(2)}%`
}

function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n")
}

function escapeCsvValue(value: string): string {
  const stringValue = value ?? ""
  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}
