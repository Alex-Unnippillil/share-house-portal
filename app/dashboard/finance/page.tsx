import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CurrencyRevenueSummary,
  findReconciliationIssues,
  formatCentsAsCurrency,
  summarizeRevenue,
  summarizeRevenueByCurrency,
} from "@/lib/finance/revenue"
import { loadFinanceDashboard } from "./loaders"

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

function formatDate(iso: string | null) {
  if (!iso) {
    return "—"
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function selectPrimaryCurrency(summaries: CurrencyRevenueSummary[]) {
  if (summaries.length <= 1) {
    return summaries[0] ?? null
  }
  return [...summaries].sort(
    (a, b) => b.totalAmountCents - a.totalAmountCents,
  )[0]
}

export default async function FinanceDashboardPage() {
  const { isAuthorized, lines } = await loadFinanceDashboard()

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restricted access</CardTitle>
          <CardDescription>
            Only property managers and admins can view finance analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ask a Roomsily administrator to update your role if you need access to
            revenue reporting.
          </p>
        </CardContent>
      </Card>
    )
  }

  const revenueByCurrency = summarizeRevenueByCurrency(lines)
  const issues = findReconciliationIssues(lines)
  const primaryCurrency = selectPrimaryCurrency(revenueByCurrency)
  const totalSummary = summarizeRevenue(
    primaryCurrency ? lines.filter((line) => line.currency === primaryCurrency.currency) : lines,
  )
  const displayedLines = lines.slice(0, 100)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Finance analytics
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Monitor Stripe invoices, recognized revenue, and deferred balances with exportable reconciliation support.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/finance/export" prefetch={false}>
            Export CSV
          </Link>
        </Button>
      </div>

      {lines.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No revenue found</CardTitle>
            <CardDescription>
              Sync Stripe invoices to populate deferred and recognized revenue calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Once the scheduled sync runs, you&apos;ll see each invoice line item with its
            recognition schedule and export options.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recognized revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {primaryCurrency
                    ? formatCentsAsCurrency(
                        totalSummary.totalRecognizedCents,
                        primaryCurrency.currency,
                      )
                    : formatCentsAsCurrency(
                        totalSummary.totalRecognizedCents,
                        lines[0].currency,
                      )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Booked for the current period.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Deferred revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {primaryCurrency
                    ? formatCentsAsCurrency(
                        totalSummary.totalDeferredCents,
                        primaryCurrency.currency,
                      )
                    : formatCentsAsCurrency(
                        totalSummary.totalDeferredCents,
                        lines[0].currency,
                      )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Remaining to be recognized.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recognition progress</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {primaryCurrency
                    ? percentFormatter.format(primaryCurrency.recognizedShare)
                    : percentFormatter.format(1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {primaryCurrency ? (
                  <span>
                    Based on invoices denominated in {primaryCurrency.currency}.
                  </span>
                ) : (
                  <span>Fully recognized.</span>
                )}
              </CardContent>
            </Card>
          </div>

          {revenueByCurrency.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Currency mix</CardTitle>
                <CardDescription>
                  Recognition progress across all currencies captured in Stripe invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Currency</th>
                        <th className="py-2 pr-4">Recognized</th>
                        <th className="py-2 pr-4">Deferred</th>
                        <th className="py-2 pr-4">Total</th>
                        <th className="py-2">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {revenueByCurrency.map((summary) => (
                        <tr key={summary.currency}>
                          <td className="py-2 pr-4 font-medium">
                            {summary.currency}
                          </td>
                          <td className="py-2 pr-4">
                            {formatCentsAsCurrency(
                              summary.totalRecognizedCents,
                              summary.currency,
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {formatCentsAsCurrency(
                              summary.totalDeferredCents,
                              summary.currency,
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {formatCentsAsCurrency(
                              summary.totalAmountCents,
                              summary.currency,
                            )}
                          </td>
                          <td className="py-2">
                            {percentFormatter.format(summary.recognizedShare)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {issues.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardHeader>
                <CardTitle>Reconciliation alerts</CardTitle>
                <CardDescription>
                  {issues.length} line item
                  {issues.length === 1 ? " has" : "s have"} rounding differences greater than one cent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {issues.slice(0, 5).map(({ line, differenceCents }) => (
                  <div key={line.lineItemId} className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">Invoice {line.invoiceId}</p>
                      <p className="text-muted-foreground">
                        Deferred + recognized differs by {differenceCents}¢.
                      </p>
                    </div>
                    <Badge variant="destructive">{line.currency}</Badge>
                  </div>
                ))}
                {issues.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    Showing the first five discrepancies. Export the CSV for a full audit trail.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Revenue recognition schedule</CardTitle>
              <CardDescription>
                Detailed line items pulled from Stripe invoices with service period coverage.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Line item</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Recognized</th>
                      <th className="px-4 py-3 text-right">Deferred</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayedLines.map((line) => (
                      <tr key={line.lineItemId} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{line.invoiceId}</td>
                        <td className="px-4 py-3">{line.lineItemId}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span>{line.customerId ?? "—"}</span>
                            {line.customerEmail && (
                              <span className="text-xs text-muted-foreground">
                                {line.customerEmail}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(line.periodStart)} – {formatDate(line.periodEnd)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCentsAsCurrency(line.totalAmountCents, line.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCentsAsCurrency(line.recognizedAmountCents, line.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCentsAsCurrency(line.deferredAmountCents, line.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={line.invoiceStatus === "paid" ? "complete" : "outline"}>
                            {line.invoiceStatus ?? "unknown"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lines.length > displayedLines.length && (
                <p className="px-4 py-4 text-xs text-muted-foreground">
                  Showing the most recent {displayedLines.length} line items. Export to review the complete history.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
