import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getContributionOverview } from "../data"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function formatChargeCount(count: number) {
  return `${count} ${count === 1 ? "charge" : "charges"}`
}

export async function ContributionBreakdownCard() {
  const breakdown = await getContributionOverview()

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Contribution breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Monitor rent, deposits, and shared reimbursements across all roommates.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Outstanding total
              </p>
              <p className="text-3xl font-semibold text-foreground">
                {currencyFormatter.format(breakdown.outstandingTotal)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground sm:text-right">
              {currencyFormatter.format(breakdown.invoicedTotal)} originally invoiced
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/70">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Category</span>
            <span className="text-right">Outstanding</span>
            <span className="text-right">Issued</span>
          </div>
          <ul>
            {breakdown.categories.map((category) => (
              <li
                key={category.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/60"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatChargeCount(category.charges)}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:block">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                    Outstanding
                  </p>
                  <p className="text-sm font-semibold text-foreground sm:text-right">
                    {currencyFormatter.format(category.outstanding)}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:block">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                    Issued
                  </p>
                  <p className="text-sm text-muted-foreground sm:text-right">
                    {currencyFormatter.format(category.issued)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
