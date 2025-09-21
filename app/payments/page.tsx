import { format, parseISO } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CatchUpPaymentCard } from "./_components/catch-up-payment-card"
import {
  calculateOutstanding,
  formatAutopayDay,
  getNextOutstandingCharge,
} from "@/lib/payments/catch-up"
import { formatCurrency } from "@/lib/payments/currency"
import { catchUpBalances } from "@/lib/payments/mock-data"
import type { CatchUpBalance } from "@/types/payments"

const paymentHighlights = [
  {
    title: "AutoPay scheduling",
    description:
      "Enable recurring rent collection with configurable due dates, grace periods, and automatic late fee handling.",
  },
  {
    title: "One-time catch up",
    description:
      "Support partial or one-off payments so roommates can settle balances without waiting for the next billing cycle.",
  },
  {
    title: "Receipt history",
    description:
      "Download itemized receipts and export payment history for reimbursement, tax, or dispute resolution needs.",
  },
  {
    title: "Shared ledger",
    description:
      "Track individual roommate contributions alongside property manager adjustments to maintain full transparency.",
  },
]

const outstandingSummaries = catchUpBalances.map((balance) => {
  const outstanding = calculateOutstanding(balance.charges)
  const nextCharge = getNextOutstandingCharge(balance.charges)
  return { balance, outstanding, nextCharge }
})

const totalOutstanding = outstandingSummaries.reduce(
  (sum, item) => sum + item.outstanding,
  0,
)

const activeAutopays = catchUpBalances.filter(
  (balance) => balance.autopayStatus === "active",
).length
const pausedAutopays = catchUpBalances.filter(
  (balance) => balance.autopayStatus === "paused",
).length
const disabledAutopays = catchUpBalances.filter(
  (balance) => balance.autopayStatus === "disabled",
).length

const autopCoveragePercentage =
  catchUpBalances.length > 0
    ? Math.round((activeAutopays / catchUpBalances.length) * 100)
    : 0

const defaultCurrency = catchUpBalances[0]?.currency ?? "USD"

const roommateSummaries = [...outstandingSummaries].sort(
  (a, b) => b.outstanding - a.outstanding,
)

function describeAutopayStatus(balance: CatchUpBalance) {
  const autopayDay = formatAutopayDay(balance.autopayDay)

  switch (balance.autopayStatus) {
    case "active":
      return `Autopay active · ${autopayDay} each month`
    case "paused":
      return `Autopay paused · resumes ${autopayDay}`
    case "disabled":
      return "Autopay off"
  }

  return ""
}

function formatFullDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy")
}

export default function PaymentsPage() {
  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Manage rent, deposits, and roommate contributions with Stripe-powered autopay and real-time status updates.
          </p>
        </div>
        <Separator />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {paymentHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Catch-up snapshot</CardTitle>
              <CardDescription>
                Monitor outstanding balances and autopay coverage across the unit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">
                    Outstanding total
                  </dt>
                  <dd className="text-lg font-semibold">
                    {formatCurrency(totalOutstanding, defaultCurrency)}
                  </dd>
                  <p className="text-xs text-muted-foreground">
                    {catchUpBalances.length} roommates tracked
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">
                    Autopay coverage
                  </dt>
                  <dd className="text-lg font-semibold">
                    {activeAutopays}/{catchUpBalances.length}
                  </dd>
                  <p className="text-xs text-muted-foreground">
                    {autopCoveragePercentage}% of roommates on autopay
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">
                    Catch-up required
                  </dt>
                  <dd className="text-lg font-semibold">
                    {pausedAutopays + disabledAutopays}
                  </dd>
                  <p className="text-xs text-muted-foreground">
                    {pausedAutopays} paused · {disabledAutopays} off
                  </p>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Roommate balances</CardTitle>
              <CardDescription>
                Review who still owes what before creating a catch-up payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {roommateSummaries.map(({ balance, outstanding, nextCharge }) => (
                <div
                  key={balance.roommateId}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{balance.roommateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {balance.unitLabel} · {describeAutopayStatus(balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last payment {formatFullDate(balance.lastPaymentDate)} · {formatCurrency(
                        balance.lastPaymentAmount,
                        balance.currency,
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(outstanding, balance.currency)}
                    </p>
                    {nextCharge ? (
                      <p className="text-xs text-muted-foreground">
                        Next: {nextCharge.description} due {format(parseISO(nextCharge.dueDate), "MMM d")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No outstanding charges</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <CatchUpPaymentCard balances={catchUpBalances} />
      </section>
    </div>
  )
}
