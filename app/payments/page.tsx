import { Suspense } from "react"

import { format, parseISO } from "date-fns"
import { CheckCircle2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ContextualHelpSearch } from "@/components/help/contextual-help-search"
import { StripeActions } from "./_components/stripe-actions"
import { CatchUpPaymentCard } from "./_components/catch-up-payment-card"
import { PaymentStatusFeed } from "./_components/payment-status-feed"
import { ContributionSummaryCard } from "./_components/contribution-summary-card"
import { RoommateLedger } from "./_components/roommate-ledger"
import { RoommateLedgerSkeleton } from "./_components/roommate-ledger-skeleton"
import {
  calculateOutstanding,
  getNextOutstandingCharge,
} from "@/lib/payments/catch-up"
import { formatCurrency } from "@/lib/payments/currency"
import { describeAutopayStatus } from "@/lib/payments/status"

import {
  loadCatchUpBalances,
  loadReceiptHistory,
  loadRoommateLedgers,
} from "./loaders"
import { ReceiptHistoryCard } from "./_components/receipt-history-card"


const paymentHighlights = [
  {
    title: "AutoPay scheduling",
    description:
      "Enable recurring rent collection with configurable due dates, grace periods, and automatic late fee handling.",
    points: [
      "Assign custom due dates per lease or roommate share.",
      "Set grace windows before late fees automatically post.",
      "Keep everyone informed with proactive autopay reminders.",
    ],
  },
  {
    title: "One-time catch up",
    description:
      "Support partial or one-off payments so roommates can settle balances without waiting for the next billing cycle.",
    points: [
      "Accept partial payments against outstanding charges instantly.",
      "Apply settlements across multiple invoices in a single flow.",
      "Log property manager adjustments so every credit is traceable.",
    ],
  },
  {
    title: "Receipt history",
    description:
      "Download itemized receipts and export payment history for reimbursement, tax, or dispute resolution needs.",
    points: [
      "Generate PDF or CSV exports on demand for bookkeeping.",
      "Surface line items for rent, deposits, and utilities in one view.",
      "Attach notes and documentation to streamline disputes.",
    ],
  },
  {
    title: "Roomsily ledger",
    description:
      "Track individual roommate contributions alongside property manager adjustments to maintain full transparency.",
    points: [
      "Monitor running balances per roommate with live updates.",
      "Contrast autopay coverage with manual payments at a glance.",
      "Share the same ledger with roommates, managers, and admins.",
    ],
  },
]

function formatFullDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy")
}

export default async function PaymentsPage() {
  const [catchUpBalances, receiptHistory] = await Promise.all([
    loadCatchUpBalances(),
    loadReceiptHistory(),

  ])
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
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
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
                      {balance.unitLabel} · {describeAutopayStatus(balance.autopayStatus, balance.autopayDay)}
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
          <PaymentStatusFeed balances={catchUpBalances} />
          <ContributionSummaryCard balances={catchUpBalances} />
          <Card>
            <CardHeader>
              <CardTitle>Pay with Stripe</CardTitle>
              <CardDescription>Create a quick checkout or open Billing Portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StripeActions />
            </CardContent>
          </Card>
        </div>
        <CatchUpPaymentCard balances={catchUpBalances} />
      </section>
      <Suspense fallback={<RoommateLedgerSkeleton />}>
        <RoommateLedgerSection />
      </Suspense>
      <ReceiptHistoryCard receipts={receiptHistory} />
      <ContextualHelpSearch
        context="payments"
        title="Payments help center"
        description="Search help articles covering autopay, receipts, and billing adjustments without leaving the dashboard."
      />
    </div>
  )
}

async function RoommateLedgerSection() {
  const ledgers = await loadRoommateLedgers()
  return <RoommateLedger ledgers={ledgers} />
}
