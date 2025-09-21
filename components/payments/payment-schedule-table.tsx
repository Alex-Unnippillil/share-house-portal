import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type BadgeProps, Badge } from "@/components/ui/badge"
import {
  deriveOccurrenceStatus,
  type RentPaymentOccurrenceRow,
  type RentPaymentScheduleRow,
} from "@/lib/payments/autopay-scheduler"

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

function formatDateString(value: string | null | undefined) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  queued: "Queued",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  overdue: "Overdue",
  skipped: "Skipped",
}

const statusVariants: Record<string, BadgeProps["variant"]> = {
  scheduled: "secondary",
  queued: "secondary",
  processing: "default",
  paid: "outline",
  failed: "destructive",
  overdue: "destructive",
  skipped: "secondary",
}

export interface PaymentScheduleTableProps {
  schedule?: RentPaymentScheduleRow | null
  occurrences: RentPaymentOccurrenceRow[]
}

export function PaymentScheduleTable({ schedule, occurrences }: PaymentScheduleTableProps) {
  const currency = schedule?.currency ?? "USD"

  const rows = (occurrences ?? []).slice().sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming charges</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payment cycles are scheduled yet. Create an AutoPay plan to generate the first invoices.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Due date</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Grace expires</th>
                  <th className="py-2 pr-4 font-medium text-right">Late fee</th>
                  <th className="py-2 pl-4 font-medium text-right">Total due</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((occurrence) => {
                  const status = schedule
                    ? deriveOccurrenceStatus(schedule, occurrence)
                    : (occurrence.status as keyof typeof statusLabels)
                  const label = statusLabels[status] ?? status
                  const variant = statusVariants[status] ?? "secondary"
                  const lateFeeCents = occurrence.late_fee_cents ?? 0
                  const totalDue = occurrence.amount_cents + lateFeeCents

                  return (
                    <tr key={occurrence.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 align-middle font-medium text-foreground">
                        {formatDateString(occurrence.due_date)}
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        {formatDateString(occurrence.grace_expires_on)}
                      </td>
                      <td className="py-3 pr-4 align-middle text-right">
                        {lateFeeCents > 0 ? formatCurrency(lateFeeCents, currency) : "—"}
                      </td>
                      <td className="py-3 pl-4 align-middle text-right font-medium text-foreground">
                        {formatCurrency(totalDue, currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
