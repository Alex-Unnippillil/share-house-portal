import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { summarizeContributionCategories } from "@/lib/payments/status"
import { formatCurrency } from "@/lib/payments/currency"
import type { IntlPreferences } from "@/lib/utils"
import type { CatchUpBalance, CatchUpChargeCategory } from "@/types/payments"

const CATEGORY_LABELS: Record<CatchUpChargeCategory, string> = {
  rent: "Rent",
  utilities: "Utilities",
  fees: "Shared fees",
  deposit: "Security deposit",
  maintenance: "Maintenance",
  parking: "Parking",
  other: "Other",
}

interface ContributionSummaryCardProps {
  balances: CatchUpBalance[]
  intl?: IntlPreferences
}

export function ContributionSummaryCard({ balances, intl }: ContributionSummaryCardProps) {
  const summaries = summarizeContributionCategories(balances)
  const defaultCurrency = balances[0]?.currency ?? "USD"

  const totalOutstanding = summaries.reduce(
    (sum, summary) => sum + summary.outstandingAmount,
    0,
  )
  const totalIssued = summaries.reduce(
    (sum, summary) => sum + summary.originalAmount,
    0,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution breakdown</CardTitle>
        <CardDescription>
          Monitor rent, deposits, and shared reimbursements across all roommates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Outstanding total</p>
            <p className="text-lg font-semibold">
              {formatCurrency(totalOutstanding, defaultCurrency, {
                locale: intl?.locale,
              })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(totalIssued, defaultCurrency, {
              locale: intl?.locale,
            })}{" "}
            originally invoiced
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pl-4 pr-2 font-medium">Category</th>
                <th className="py-2 pr-2 text-right font-medium">Outstanding</th>
                <th className="py-2 pr-4 text-right font-medium">Issued</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.category} className="border-t">
                  <td className="py-2 pl-4 pr-2">
                    <div className="font-medium">
                      {CATEGORY_LABELS[summary.category] ?? summary.category}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {summary.chargeCount} charge{summary.chargeCount === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {formatCurrency(summary.outstandingAmount, defaultCurrency, {
                      locale: intl?.locale,
                    })}
                  </td>
                  <td className="py-2 pr-4 text-right text-muted-foreground">
                    {formatCurrency(summary.originalAmount, defaultCurrency, {
                      locale: intl?.locale,
                    })}
                  </td>
                </tr>
              ))}
              {summaries.length === 0 ? (
                <tr>
                  <td className="py-4 pl-4 text-sm text-muted-foreground" colSpan={3}>
                    No roommate charges found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
