import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import type { RentPaymentScheduleRow } from "@/lib/payments/autopay-scheduler"

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

function describeLateFee(schedule: RentPaymentScheduleRow): string {
  if (schedule.late_fee_type === "flat") {
    const amount = schedule.late_fee_flat_cents ?? 0
    if (amount <= 0) {
      return "Late fee disabled"
    }

    return `${formatCurrency(amount, schedule.currency)} applied once when grace expires`
  }

  const percent = schedule.late_fee_percent ?? 0
  if (percent <= 0) {
    return "Late fee disabled"
  }

  const cap = schedule.late_fee_cap_cents
  return cap && cap > 0
    ? `${percent}% of rent (capped at ${formatCurrency(cap, schedule.currency)})`
    : `${percent}% of rent after grace period`
}

function describeGracePeriod(days: number) {
  if (days === 0) {
    return "No grace period"
  }

  return `${days} ${days === 1 ? "day" : "days"} after the due date`
}

export interface AutoPaySummaryCardProps {
  schedule?: RentPaymentScheduleRow | null
}

export function AutoPaySummaryCard({ schedule }: AutoPaySummaryCardProps) {
  if (!schedule) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>AutoPay schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>AutoPay isn't configured yet.</p>
          <p>Complete the form to start collecting rent automatically every month.</p>
        </CardContent>
      </Card>
    )
  }

  const statusVariant = schedule.autopay_enabled ? "default" : "secondary"
  const statusLabel = schedule.autopay_enabled ? "AutoPay enabled" : "AutoPay paused"
  const nextRun = schedule.next_run_date ? formatDate(schedule.next_run_date) : "Not scheduled"

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>AutoPay schedule</CardTitle>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Next charge</p>
            <p>{nextRun}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Monthly rent</p>
            <p>{formatCurrency(schedule.rent_amount_cents, schedule.currency)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Due date</p>
          <p>{`Every month on the ${schedule.day_of_month}${getOrdinal(schedule.day_of_month)} (${schedule.timezone})`}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Grace period</p>
          <p>{describeGracePeriod(schedule.grace_period_days)}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Late fee policy</p>
          <p>{describeLateFee(schedule)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function getOrdinal(day: number) {
  const remainder = day % 10
  if (day >= 11 && day <= 13) {
    return "th"
  }
  switch (remainder) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}
