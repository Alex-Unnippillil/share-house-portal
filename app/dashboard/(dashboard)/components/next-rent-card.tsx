import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import SmartLink from "@/components/navigation/SmartLink"
import { getDashboardAudience, getRentSummary } from "../data"
import { CalendarDays, Clock, RefreshCcw } from "lucide-react"

export async function NextRentCard() {
  const [summary, audience] = await Promise.all([
    getRentSummary(),
    getDashboardAudience(),
  ])
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(summary.amount)
  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(summary.balance)
  const autopayLabel =
    audience === "manager"
      ? "Portfolio view"
      : summary.autopayEnabled
        ? "Autopay on"
        : "Manual review"
  const autopayVariant =
    audience === "manager"
      ? "outline"
      : summary.autopayEnabled
        ? "secondary"
        : "outline"

  const dueDate = new Date(summary.dueDate)
  const today = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const diffInDays = Math.ceil((dueDate.getTime() - today.getTime()) / msPerDay)

  const dueDescriptor =
    diffInDays > 1
      ? `Due in ${diffInDays} days`
      : diffInDays === 1
        ? "Due tomorrow"
        : diffInDays === 0
          ? "Due today"
          : `Overdue by ${Math.abs(diffInDays)} days`

  const eyebrowLabel =
    audience === "manager" ? "Portfolio rent forecast" : "Next rent due"
  const lastPaymentDate = new Date(summary.lastPaymentDate)
  const lastPaymentLabel =
    audience === "manager"
      ? `Last cycle closed ${lastPaymentDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`
      : `Last paid ${lastPaymentDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`
  const lastPaymentHelper =
    audience === "manager"
      ? "Includes posted payments across managed units"
      : "We’ll email receipts after processing"
  const ctaLabel = audience === "manager" ? "Review receivables" : "Manage payments"
  const ctaIntent = audience === "manager" ? "standard" : "critical"

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrowLabel}</p>
          <CardTitle className="text-lg font-semibold">{summary.unitLabel}</CardTitle>
          <p className="text-sm text-muted-foreground">{summary.scopeLabel}</p>
          {summary.highlight ? (
            <p className="text-xs text-muted-foreground">{summary.highlight}</p>
          ) : null}
        </div>
        <Badge
          variant={autopayVariant}
          className="flex items-center gap-1"
        >
          <RefreshCcw className="size-3.5" />
          {autopayLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
            <p className="text-3xl font-semibold">{formattedAmount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">{summary.balanceLabel}</p>
            <p className="text-sm font-medium">
              {summary.balance > 0 ? formattedBalance : "No balance"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border/60 p-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {dueDate.toLocaleDateString(undefined, {
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
              <p className="text-sm font-medium">{lastPaymentLabel}</p>
              <p className="text-xs text-muted-foreground">{lastPaymentHelper}</p>
            </div>
          </div>
        </div>

        <SmartLink href="/payments" className="inline-flex" intent={ctaIntent}>
          <Button size="sm" className="w-full sm:w-auto">
            {ctaLabel}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
