import type { SharedLedgerPurchase } from "@/types/supplies"

export function getLedgerMonthKey(purchasedAt: string): string {
  const date = new Date(purchasedAt)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export function getAvailableLedgerMonths(entries: SharedLedgerPurchase[]): string[] {
  const uniqueMonths = new Set(entries.map((entry) => getLedgerMonthKey(entry.purchasedAt)))
  return Array.from(uniqueMonths).sort()
}

export function formatLedgerMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-")
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return month
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex, 1)))

  return formatted
}
