import { format, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/payments/currency"
import { sharedLedgerEntries } from "@/lib/supplies/ledger-data"
import {
  formatLedgerMonth,
  getAvailableLedgerMonths,
  getLedgerMonthKey,
} from "@/lib/supplies/ledger-utils"

import { LedgerDownloadCard } from "./_components/ledger-download-card"

function getCurrentMonthKey(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export default function SuppliesPage() {
  const availableMonths = getAvailableLedgerMonths(sharedLedgerEntries)
  const defaultMonth =
    availableMonths[availableMonths.length - 1] ?? getCurrentMonthKey()

  const monthOptionSet = new Set([defaultMonth, ...availableMonths])
  const sortedMonths = Array.from(monthOptionSet)
    .sort()
    .reverse()
  const monthOptions = sortedMonths.map((value) => ({
    value,
    label: formatLedgerMonth(value),
  }))

  const monthEntries = sharedLedgerEntries
    .filter((entry) => getLedgerMonthKey(entry.purchasedAt) === defaultMonth)
    .sort(
      (a, b) =>
        new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime(),
    )

  const totalSpend = monthEntries.reduce(
    (sum, entry) => sum + entry.totalAmount,
    0,
  )
  const shareCount = monthEntries.reduce(
    (sum, entry) => sum + entry.shares.length,
    0,
  )
  const averageShare = shareCount > 0 ? totalSpend / shareCount : 0

  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Shared supplies ledger
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Track household purchases, reimbursements, and roommate splits with
            a CSV export that respects your local timezone.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <LedgerDownloadCard
            months={monthOptions}
            defaultMonth={defaultMonth}
          />

          <Card>
            <CardHeader>
              <CardTitle>{formatLedgerMonth(defaultMonth)} snapshot</CardTitle>
              <CardDescription>
                A quick look at how much roommates have spent and split this
                month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthEntries.length > 0 ? (
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Total communal spend
                    </dt>
                    <dd className="text-lg font-semibold">
                      {formatCurrency(totalSpend, monthEntries[0].currency)}
                    </dd>
                    <p className="text-xs text-muted-foreground">
                      Across {monthEntries.length} purchases
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Roommate shares tracked
                    </dt>
                    <dd className="text-lg font-semibold">{shareCount}</dd>
                    <p className="text-xs text-muted-foreground">
                      {Math.max(0, shareCount - monthEntries.length)} splits
                      beyond the payer
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Average share amount
                    </dt>
                    <dd className="text-lg font-semibold">
                      {formatCurrency(averageShare, monthEntries[0].currency)}
                    </dd>
                    <p className="text-xs text-muted-foreground">
                      Helps estimate reimbursements owed
                    </p>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shared purchases have been logged for this month yet.
                  Record supply runs to unlock rich exports and analytics.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{formatLedgerMonth(defaultMonth)} purchases</CardTitle>
            <CardDescription>
              Itemized roommate contributions for the most recent ledger month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">When</th>
                      <th className="py-2 pr-4 font-medium">Purchase</th>
                      <th className="py-2 pr-4 font-medium">Paid by</th>
                      <th className="py-2 pr-4 font-medium text-right">Total</th>
                      <th className="py-2 pr-4 font-medium">Roommate shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthEntries.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {format(parseISO(entry.purchasedAt), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(entry.purchasedAt), "h:mm a")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.merchant}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">
                            {entry.description}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {entry.category}
                          </p>
                          {entry.note ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {entry.note}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-sm font-medium">
                          {entry.paidBy.name}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium">
                          {formatCurrency(entry.totalAmount, entry.currency)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {entry.shares.map((share) => (
                              <Badge key={`${entry.id}-${share.roommateId}`} variant="secondary">
                                {share.roommateName}
                                <span className="ml-1 font-medium text-foreground">
                                  {formatCurrency(share.amount, entry.currency)}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Once a roommate logs a supply run, it will appear here along with
                how the cost is split. Use the export action to share a copy
                with the household.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
