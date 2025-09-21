import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

type StatusVariant = BadgeProps["variant"]

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

const autopaySchedule: Array<{
  title: string
  dueDate: string
  amount: string
  summary: string
  status: { label: string; variant: StatusVariant }
  details: Array<{ label: string; value: string }>
}> = [
  {
    title: "May rent draft",
    dueDate: "Draft window • Apr 28 – May 1",
    amount: "$2,400 total",
    summary:
      "Stripe will draft three roommate payment methods automatically and split the receivable across the unit ledger.",
    status: { label: "Scheduled", variant: "secondary" },
    details: [
      { label: "Grace period", value: "4 days" },
      { label: "Next webhook sync", value: "In 14 minutes" },
      { label: "Late fee", value: "$35 after May 5" },
      { label: "Notifications", value: "Email + push" },
    ],
  },
  {
    title: "April rent",
    dueDate: "Settled • Apr 1 at 9:02 AM",
    amount: "$2,400 total",
    summary:
      "All roommates posted successfully with receipts issued automatically and sent to the property manager.",
    status: { label: "Paid", variant: "complete" },
    details: [
      { label: "Processing time", value: "2 minutes" },
      { label: "ACH disbursement", value: "Apr 2" },
      { label: "Receipts", value: "3 emailed" },
      { label: "Ledger export", value: "CSV generated" },
    ],
  },
  {
    title: "Utilities true-up",
    dueDate: "Draft window • Apr 18 – Apr 20",
    amount: "$180 total",
    summary:
      "Jamie paused autopay last month, so reminders will escalate if the manual payment is not confirmed before the draft.",
    status: { label: "Action needed", variant: "destructive" },
    details: [
      { label: "Outstanding", value: "$60" },
      { label: "Reminder cadence", value: "Every 6 hours" },
      { label: "Next sync", value: "Stripe invoice #INV-409" },
      { label: "Escalation", value: "Notify manager Apr 21" },
    ],
  },
]

const roommateShares: Array<{
  name: string
  share: number
  amount: string
  autopay: string
  progress: number
  status: { label: string; variant: StatusVariant }
}> = [
  {
    name: "Alex Rivera",
    share: 40,
    amount: "$960",
    autopay: "Autopay • Chase Visa • Synced 2m ago",
    progress: 100,
    status: { label: "Drafted", variant: "complete" },
  },
  {
    name: "Priya Desai",
    share: 35,
    amount: "$840",
    autopay: "Autopay • ACH • Settled Apr 1",
    progress: 100,
    status: { label: "Paid", variant: "complete" },
  },
  {
    name: "Jamie Chen",
    share: 25,
    amount: "$600",
    autopay: "Manual payment • Reminder sent 8m ago",
    progress: 60,
    status: { label: "Action needed", variant: "destructive" },
  },
]

const depositLedger: Array<{
  title: string
  amount: string
  date: string
  note: string
  status: { label: string; variant: StatusVariant }
}> = [
  {
    title: "Security deposit",
    amount: "$2,400 held",
    date: "Received Aug 15, 2023",
    note: "Tracked in segregated trust account with quarterly reconciliations.",
    status: { label: "Cleared", variant: "complete" },
  },
  {
    title: "Pet deposit top-up",
    amount: "$300 pending",
    date: "Submitted Mar 2, 2024",
    note: "ACH verification underway; roommates notified once funds settle.",
    status: { label: "Processing", variant: "secondary" },
  },
  {
    title: "Damage withhold",
    amount: "$0",
    date: "Current",
    note: "No active deductions. All inspections logged and shared with the household.",
    status: { label: "None", variant: "outline" },
  },
]

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

      <section className="grid gap-6 md:grid-cols-2">
        {paymentHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Autopay & billing cadence</CardTitle>
              <Badge variant="outline">Syncs with Stripe every minute</Badge>
            </div>
            <CardDescription>
              Configure due dates, grace periods, and notifications to keep each roommate on track without manual follow-ups.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {autopaySchedule.map((item) => (
                <div key={item.title} className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.dueDate}</p>
                    </div>
                    <Badge variant={item.status.variant}>{item.status.label}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-4 sm:block">
                      <span className="text-muted-foreground">Total draft</span>
                      <span className="font-medium sm:mt-0.5 sm:block">{item.amount}</span>
                    </div>
                    {item.details.map((detail) => (
                      <div key={detail.label} className="flex items-center justify-between gap-4 sm:block">
                        <span className="text-muted-foreground">{detail.label}</span>
                        <span className="font-medium sm:mt-0.5 sm:block">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{item.summary}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Real-time monitoring</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Webhook events reconcile paid, pending, and failed invoices every few minutes.</li>
                <li>• Roommates see updates instantly in the dashboard, with push alerts on retries or declines.</li>
                <li>• Export-ready ledger rows stream to the admin console for nightly reconciliation.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Need to tweak the next cycle?</p>
                <p className="text-sm text-muted-foreground">
                  Override drafts, pause a roommate, or trigger an off-cycle charge without leaving the portal.
                </p>
              </div>
              <Button variant="outline">Adjust autopay rules</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Roommate contributions</CardTitle>
              <CardDescription>
                Keep tabs on how each roommate shares rent, utilities, and deposits with live payment health.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {roommateShares.map((roommate) => (
                <div key={roommate.name} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{roommate.name}</p>
                      <p className="text-sm text-muted-foreground">{roommate.autopay}</p>
                    </div>
                    <Badge variant={roommate.status.variant}>{roommate.status.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Share {roommate.share}%</span>
                    <span className="font-medium">{roommate.amount}</span>
                  </div>
                  <Progress value={roommate.progress} aria-label={`${roommate.name} payment progress`} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deposits & holds</CardTitle>
              <CardDescription>
                Track deposits, pet fees, and potential deductions with full visibility for roommates and managers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {depositLedger.map((entry) => (
                <div key={entry.title} className="space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.date}</p>
                    </div>
                    <Badge variant={entry.status.variant}>{entry.status.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">{entry.amount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.note}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                Download ledger history
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
