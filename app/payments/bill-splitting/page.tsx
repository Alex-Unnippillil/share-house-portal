import { Metadata } from "next"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { ArrowRight, CalendarClock, Sparkles, Wallet, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { catchUpBalances } from "@/lib/payments/mock-data"
import {
  AUTOPAY_STATUS_BADGES,
  createRoommateAutopayState,
  describeAutopayStatus,
  summarizeContributionCategories,
} from "@/lib/payments/status"
import {
  calculateOutstanding,
  getNextOutstandingCharge,
} from "@/lib/payments/catch-up"
import { formatCurrency } from "@/lib/payments/currency"

export const metadata: Metadata = {
  title: "Bill splitting & rent coordination",
  description:
    "Plan monthly rent, utilities, and reimbursements with Splitwise-style ledgers, Venmo nudges, and autopay orchestration.",
}

const roommateAutopay = createRoommateAutopayState(catchUpBalances)
const totalOutstanding = roommateAutopay.reduce(
  (sum, roommate) => sum + roommate.outstanding,
  0,
)
const activeAutopayCount = roommateAutopay.filter(
  (roommate) => roommate.autopayStatus === "active",
).length
const autopayCoverage =
  roommateAutopay.length > 0
    ? Math.round((activeAutopayCount / roommateAutopay.length) * 100)
    : 0

const outstandingByRoommate = catchUpBalances.map((balance) => {
  const nextCharge = getNextOutstandingCharge(balance.charges)
  return {
    roommateId: balance.roommateId,
    roommateName: balance.roommateName,
    unitLabel: balance.unitLabel,
    monthlyShare: balance.monthlyShare,
    autopayStatus: balance.autopayStatus,
    autopayDay: balance.autopayDay,
    lastPaymentAmount: balance.lastPaymentAmount,
    lastPaymentDate: balance.lastPaymentDate,
    currency: balance.currency,
    outstanding: calculateOutstanding(balance.charges),
    nextCharge,
  }
})

const contributionSummaries = summarizeContributionCategories(catchUpBalances)
const totalOriginalAmount = contributionSummaries.reduce(
  (sum, category) => sum + category.originalAmount,
  0,
)
const upcomingCharges = catchUpBalances
  .flatMap((balance) =>
    balance.charges.map((charge) => ({
      roommateId: balance.roommateId,
      roommateName: balance.roommateName,
      unitLabel: balance.unitLabel,
      autopayStatus: balance.autopayStatus,
      autopayDay: balance.autopayDay,
      currency: balance.currency,
      ...charge,
    })),
  )
  .filter((charge) => charge.outstandingAmount > 0)
  .sort(
    (a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )
  .slice(0, 6)

const installmentPlan = catchUpBalances.map((balance) => ({
  roommateId: balance.roommateId,
  roommateName: balance.roommateName,
  currency: balance.currency,
  autopayDay: balance.autopayDay,
  monthlyShare: balance.monthlyShare,
  firstHalf: balance.monthlyShare / 2,
  secondHalf: balance.monthlyShare / 2,
}))

const workflowHighlights = [
  {
    title: "Splitwise-style expense ledger",
    description:
      "Log every roommate reimbursement, from rent to groceries, and keep a running balance so nobody fronts the bill alone.",
    badge: "Inspired by Splitwise",
  },
  {
    title: "Venmo-ready requests & nudges",
    description:
      "Trigger one-tap reminders and payment links when balances change so roommates can settle up with the tools they already use.",
    badge: "Works like Venmo",
  },
  {
    title: "YSplit synchronized autopay",
    description:
      "Schedule shared charges to hit each bank account simultaneously so the property manager is paid without IOUs or delays.",
    badge: "YSplit concept",
  },
  {
    title: "Flex-style rent runway",
    description:
      "Offer optional mid-month installments that still deliver the full rent to the landlord on the 1st while matching paycheck timing.",
    badge: "Flex & Zenbase inspired",
  },
]

export default function BillSplittingPage() {
  const defaultCurrency = roommateAutopay[0]?.currency ?? "USD"
  const dueThisWeekCount = upcomingCharges.filter((charge) => {
    const daysUntilDue = differenceInCalendarDays(
      parseISO(charge.dueDate),
      new Date(),
    )
    return daysUntilDue >= 0 && daysUntilDue <= 7
  }).length

  return (
    <div className="container max-w-6xl space-y-12 py-12">
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Shared finances</Badge>
          <span className="text-sm text-muted-foreground">
            Equal parts bill splitting and rent automation
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bill splitting & rent coordination hub
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Combine roommate-friendly ledgers with autopay orchestration so every rent, utility, and reimbursement is settled without
            guesswork.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" className="gap-2">
            <a href="#roommate-ledger">
              Review roommate balances
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href="#installment-plans">
              Configure rent runway
              <CalendarClock className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </header>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total outstanding</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(totalOutstanding, defaultCurrency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {roommateAutopay.length} roommates contributing this cycle
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Autopay coverage</CardDescription>
              <CardTitle className="text-2xl">{autopayCoverage}%</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {activeAutopayCount} roommates synced for automatic debits
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Installment ready</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(
                  installmentPlan.reduce(
                    (sum, plan) => sum + plan.firstHalf,
                    0,
                  ),
                  defaultCurrency,
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Mid-month payouts available without delaying landlord funding
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Due this week</CardDescription>
              <CardTitle className="text-2xl">{dueThisWeekCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Priority reminders queued for the next few days
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="roommate-ledger" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Splitwise-style roommate ledger
          </h2>
          <p className="text-sm text-muted-foreground">
            Track monthly rent shares, utilities, and reimbursements per roommate with clear autopay status, reminders, and next
            actions.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] bg-muted/60 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Roommate</div>
            <div>Autopay</div>
            <div className="text-right">Outstanding</div>
            <div className="text-right">Next due</div>
          </div>
          <div className="divide-y">
            {outstandingByRoommate.map((roommate) => {
              const badge = AUTOPAY_STATUS_BADGES[roommate.autopayStatus]
              return (
                <div
                  key={roommate.roommateId}
                  className="grid items-start gap-4 px-6 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {roommate.roommateName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roommate.unitLabel} · Last paid {format(
                        parseISO(roommate.lastPaymentDate),
                        "MMM d",
                      )}
                      {" · "}
                      {formatCurrency(
                        roommate.lastPaymentAmount,
                        roommate.currency,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {describeAutopayStatus(
                        roommate.autopayStatus,
                        roommate.autopayDay,
                      )}
                    </span>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatCurrency(roommate.outstanding, roommate.currency)}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {roommate.nextCharge ? (
                      <span>
                        {format(parseISO(roommate.nextCharge.dueDate), "MMM d")}
                        {" · "}
                        {roommate.nextCharge.description}
                      </span>
                    ) : (
                      <span>All caught up</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardDescription>
              Understand how rent, utilities, parking, and deposits contribute to the current outstanding balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contributionSummaries.map((summary) => {
              const percent =
                totalOriginalAmount > 0
                  ? Math.round(
                      (summary.originalAmount / totalOriginalAmount) * 100,
                    )
                  : 0

              return (
                <div key={summary.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{summary.category}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(
                        summary.outstandingAmount,
                        defaultCurrency,
                      )}
                    </span>
                  </div>
                  <Progress value={percent} />
                  <p className="text-xs text-muted-foreground">
                    {summary.chargeCount} charges tracked · {percent}% of the original billed amount
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming reminders</CardTitle>
            <CardDescription>
              Surface Venmo-style nudges with precise due dates so roommates can settle before late fees appear.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingCharges.map((charge) => (
              <div key={`${charge.roommateId}-${charge.id}`} className="rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {charge.roommateName} · {charge.description}
                  </p>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Wallet className="size-3.5" aria-hidden="true" />
                    Due {format(parseISO(charge.dueDate), "MMM d")}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {formatCurrency(charge.outstandingAmount, charge.currency)} outstanding
                  </span>
                  <span>
                    {describeAutopayStatus(
                      charge.autopayStatus,
                      charge.autopayDay,
                    )}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="installment-plans" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Flex-style rent runway
          </h2>
          <p className="text-sm text-muted-foreground">
            Align rent pulls with paycheck schedules. Roomsily forwards the full rent on the 1st while roommates pay in two predictable
            installments.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {installmentPlan.map((plan) => (
            <Card key={plan.roommateId} className="border-dashed">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">{plan.roommateName}</CardTitle>
                <CardDescription>
                  Autopay on the {plan.autopayDay} · Monthly share {formatCurrency(plan.monthlyShare, plan.currency)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                  <span>1st of month</span>
                  <span className="font-medium">
                    {formatCurrency(plan.firstHalf, plan.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                  <span>15th of month</span>
                  <span className="font-medium">
                    {formatCurrency(plan.secondHalf, plan.currency)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Roomsily settles the full balance with the property manager on day one while roommates contribute in two stress-free
                  chunks.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {workflowHighlights.map((highlight) => (
          <Card key={highlight.title} className="h-full">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit">
                {highlight.badge}
              </Badge>
              <CardTitle>{highlight.title}</CardTitle>
              <CardDescription>{highlight.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <Zap className="size-4 text-primary" aria-hidden="true" />
                <span>
                  Pair ledger transparency with payment automation so every roommate knows exactly when and how to settle up.
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl border bg-muted/20 p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Ready to balance the books?</h3>
            <p className="text-sm text-muted-foreground">
              Launch catch-up payments, export receipts, or invite roommates to autopay from the Payments home.
            </p>
          </div>
          <Button asChild className="gap-2">
            <a href="/payments">
              Open rent tools
              <Sparkles className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
