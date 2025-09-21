import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { LeaseSummary, RentLedgerSummary } from "../actions"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

type RentSummaryCardProps = {
  lease: LeaseSummary
  summary: RentLedgerSummary
  action?: ReactNode
}

export function RentSummaryCard({ lease, summary, action }: RentSummaryCardProps) {
  const property = lease.unit?.property
  const address = [property?.street, property?.city, property?.state]
    .filter(Boolean)
    .join(", ")

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Monthly rent</CardTitle>
          <CardDescription>
            {property ? property.name : "Your lease"}
            {address ? ` • ${address}` : null}
            {lease.unit ? ` • Unit ${lease.unit.unitNumber}` : null}
          </CardDescription>
        </div>
        <Badge className="whitespace-nowrap" variant="outline">
          {lease.status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Outstanding balance</p>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.formattedOutstanding}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Monthly rent</dt>
              <dd>{currency.format(lease.rentAmount)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Security deposit</dt>
              <dd>{currency.format(lease.depositAmount)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Lease dates</dt>
              <dd>
                {dateFormatter.format(new Date(lease.startDate))}
                {lease.endDate ? ` – ${dateFormatter.format(new Date(lease.endDate))}` : ""}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Next due</dt>
              <dd>
                {summary.nextDueDate
                  ? dateFormatter.format(new Date(summary.nextDueDate))
                  : "Paid in full"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-lg border bg-muted/40 p-4 text-sm">
          <div>
            <p className="font-medium">Need a receipt?</p>
            <p className="text-muted-foreground">
              Payment confirmations are saved automatically once a checkout session
              succeeds.
            </p>
          </div>
          {action ? <div className="flex flex-col gap-2">{action}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}
