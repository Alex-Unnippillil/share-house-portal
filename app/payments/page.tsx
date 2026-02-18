import { Suspense } from "react"

import { format, parseISO } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PortalPageBlueprint } from "@/components/layouts/portal-page-blueprint"
import {
  calculateOutstanding,
  getNextOutstandingCharge,
} from "@/lib/payments/catch-up"
import { formatCurrency } from "@/lib/payments/currency"
import { describeAutopayStatus } from "@/lib/payments/status"

import { StripeActions } from "./_components/stripe-actions"
import { CatchUpPaymentCard } from "./_components/catch-up-payment-card"
import { PaymentStatusFeed } from "./_components/payment-status-feed"
import { ContributionSummaryCard } from "./_components/contribution-summary-card"
import { RoommateLedger } from "./_components/roommate-ledger"
import { RoommateLedgerSkeleton } from "./_components/roommate-ledger-skeleton"
import {
  loadCatchUpBalances,
  loadReconciliationDashboardData,
  loadReceiptHistory,
  loadRoommateLedgers,
} from "./loaders"
import { ReceiptHistoryCard } from "./_components/receipt-history-card"
import { ReconciliationDashboardCard } from "./_components/reconciliation-dashboard-card"

function formatFullDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy")
}

export default async function PaymentsPage() {
  const [catchUpBalances, receiptHistory, reconciliationData] = await Promise.all([
    loadCatchUpBalances(),
    loadReceiptHistory(),
    loadReconciliationDashboardData(),
  ])

  const outstandingSummaries = catchUpBalances.map((balance) => {
    const outstanding = calculateOutstanding(balance.charges)
    const nextCharge = getNextOutstandingCharge(balance.charges)
    return { balance, outstanding, nextCharge }
  })

  const totalOutstanding = outstandingSummaries.reduce(
    (sum, item) => sum + item.outstanding,
    0
  )

  const activeAutopays = catchUpBalances.filter(
    (balance) => balance.autopayStatus === "active"
  ).length
  const pausedAutopays = catchUpBalances.filter(
    (balance) => balance.autopayStatus === "paused"
  ).length
  const disabledAutopays = catchUpBalances.filter(
    (balance) => balance.autopayStatus === "disabled"
  ).length

  const autopCoveragePercentage =
    catchUpBalances.length > 0
      ? Math.round((activeAutopays / catchUpBalances.length) * 100)
      : 0

  const defaultCurrency = catchUpBalances[0]?.currency ?? "USD"

  const roommateSummaries = [...outstandingSummaries].sort(
    (a, b) => b.outstanding - a.outstanding
  )

  const isManager = reconciliationData.canManagePayments

  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <PortalPageBlueprint
        title="Payments"
        description="Manage rent, autopay, and reconciliation from a single Stripe-powered workflow with mirrored status in Supabase."
        metrics={[
          {
            label: "Outstanding total",
            value: formatCurrency(totalOutstanding, defaultCurrency),
            helperText: `${catchUpBalances.length} roommates tracked`,
          },
          {
            label: "Autopay coverage",
            value: `${autopCoveragePercentage}%`,
            helperText: `${activeAutopays}/${catchUpBalances.length} roommates active`,
          },
          {
            label: "Catch-up needed",
            value: `${pausedAutopays + disabledAutopays}`,
            helperText: `${pausedAutopays} paused · ${disabledAutopays} disabled`,
          },
        ]}
        primaryActionTitle={
          isManager ? "Resolve failed or overdue payments" : "Keep rent on schedule"
        }
        primaryActionDescription={
          isManager
            ? "Prioritize failed charges, triage retry strategy, and keep roommate ledgers balanced before month end."
            : "Enable autopay or submit a one-time catch-up payment so your balance stays current."
        }
        primaryCta={
          isManager
            ? { label: "Open reconciliation queue", href: "#reconciliation" }
            : { label: "Create catch-up payment", href: "#catch-up-payment" }
        }
        fallbackCta={
          isManager
            ? { label: "Review settlement status", href: "#status-feed" }
            : { label: "Manage Stripe billing", href: "#stripe-actions" }
        }
        supportModules={[
          {
            title: "Receipt history",
            description:
              "Download itemized receipts and maintain audit-ready payment history without leaving the portal.",
          },
          {
            title: "Roommate ledger transparency",
            description:
              "Compare each roommate's contributions and outstanding balances in one shared source of truth.",
          },
        ]}
      />

      <section
        id="payments-overview"
        className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      >
        <div className="space-y-6">
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
                      {balance.unitLabel} ·{" "}
                      {describeAutopayStatus(balance.autopayStatus, balance.autopayDay)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last payment {formatFullDate(balance.lastPaymentDate)} ·{" "}
                      {formatCurrency(balance.lastPaymentAmount, balance.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(outstanding, balance.currency)}
                    </p>
                    {nextCharge ? (
                      <p className="text-xs text-muted-foreground">
                        Next: {nextCharge.description} due{" "}
                        {format(parseISO(nextCharge.dueDate), "MMM d")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No outstanding charges
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <section id="status-feed">
            <PaymentStatusFeed balances={catchUpBalances} />
          </section>

          <ContributionSummaryCard balances={catchUpBalances} />

          <section id="stripe-actions">
            <Card>
              <CardHeader>
                <CardTitle>Pay with Stripe</CardTitle>
                <CardDescription>
                  Create a one-time checkout session or open Billing Portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeActions />
              </CardContent>
            </Card>
          </section>
        </div>

        <section id="catch-up-payment">
          <CatchUpPaymentCard balances={catchUpBalances} />
        </section>
      </section>

      <Suspense fallback={<RoommateLedgerSkeleton />}>
        <RoommateLedgerSection />
      </Suspense>

      <section id="receipt-history">
        <ReceiptHistoryCard receipts={receiptHistory} />
      </section>

      {reconciliationData.canManagePayments ? (
        <section id="reconciliation">
          <ReconciliationDashboardCard
            failedPayments={reconciliationData.failedPayments}
          />
        </section>
      ) : null}
    </div>
  )
}

async function RoommateLedgerSection() {
  const ledgers = await loadRoommateLedgers()
  return <RoommateLedger ledgers={ledgers} />
}
