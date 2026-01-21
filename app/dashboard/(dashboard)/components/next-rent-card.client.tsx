"use client"

import SmartLink from "@/components/navigation/SmartLink"
import { usePreferences } from "@/components/preferences/preferences-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RentSummary } from "../data"
import { CalendarDays, Clock, RefreshCcw } from "lucide-react"

interface NextRentCardClientProps {
  summary: RentSummary
}

function describeDueDate(diffInDays: number) {
  if (diffInDays > 1) return `Due in ${diffInDays} days`
  if (diffInDays === 1) return "Due tomorrow"
  if (diffInDays === 0) return "Due today"
  return `Overdue by ${Math.abs(diffInDays)} days`
}

export function NextRentCardClient({ summary }: NextRentCardClientProps) {
  const { formatCurrency, formatDate } = usePreferences()

  const dueDate = new Date(summary.dueDate)
  const diffInDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const dueDescriptor = describeDueDate(diffInDays)

  const formattedAmount = formatCurrency(summary.amount, "USD")
  const outstandingBalance =
    summary.balance > 0 ? formatCurrency(summary.balance, "USD") : "No balance"

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Next rent due</CardTitle>
          <p className="text-sm text-muted-foreground">Unit 3B • Shared balance</p>
        </div>
        <Badge variant={summary.autopayEnabled ? "secondary" : "outline"} className="flex items-center gap-1">
          <RefreshCcw className="size-3.5" />
          {summary.autopayEnabled ? "Autopay on" : "Autopay off"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
            <p className="text-3xl font-semibold">{formattedAmount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
            <p className="text-sm font-medium">{outstandingBalance}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border/60 p-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {formatDate(dueDate, {
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">{dueDescriptor}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border/60 p-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Last paid {formatDate(summary.lastPaymentDate, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">We’ll email receipts after processing</p>
            </div>
          </div>
        </div>

        <SmartLink href="/payments" className="inline-flex" intent="critical">
          <Button size="sm" className="w-full sm:w-auto">
            Manage payments
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
