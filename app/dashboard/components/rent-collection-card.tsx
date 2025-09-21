import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import type { RentCollectionSummary } from "../lib/data-sources"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

type RentCollectionCardProps = {
  summary: RentCollectionSummary
}

export function RentCollectionCard({ summary }: RentCollectionCardProps) {
  const outstanding = Math.max(summary.totalDue - summary.totalCollected, 0)
  const paidPercentage = summary.totalDue
    ? Math.min(100, Math.round((summary.totalCollected / summary.totalDue) * 100))
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rent collection</CardTitle>
        <CardDescription>
          {paidPercentage}% collected — {currency.format(outstanding)} outstanding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={paidPercentage} aria-label="Rent collection progress" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label="Collected" value={currency.format(summary.totalCollected)} emphasis />
          <Metric label="Outstanding" value={currency.format(outstanding)} />
          <Metric label="Delinquent residents" value={summary.delinquentCount.toString()} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Status breakdown</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {Object.entries(summary.breakdown).map(([status, amount]) => (
                <li key={status} className="flex items-center justify-between">
                  <span className="capitalize">{status.replace(/_/g, " ")}</span>
                  <span className="font-medium text-foreground">{currency.format(amount)}</span>
                </li>
              ))}
              {Object.keys(summary.breakdown).length === 0 ? (
                <li className="text-muted-foreground">No payments recorded</li>
              ) : null}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Upcoming ({summary.autopayCount} on autopay)
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {summary.upcoming.map((payment) => (
                <li key={payment.id} className="flex flex-col rounded-md border border-border p-3">
                  <span className="font-medium text-foreground">{payment.residentName}</span>
                  <span className="flex items-center justify-between">
                    <span>{currency.format(payment.amount)}</span>
                    <span>{format(new Date(payment.dueDate), "MMM d")}</span>
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {payment.status}
                  </span>
                </li>
              ))}
              {summary.upcoming.length === 0 ? (
                <li className="text-muted-foreground">All payments are current.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type MetricProps = {
  label: string
  value: string
  emphasis?: boolean
}

function Metric({ label, value, emphasis }: MetricProps) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${emphasis ? "text-foreground" : "text-muted-foreground"}`}>
        {value}
      </p>
    </div>
  )
}
