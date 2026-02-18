import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import SmartLink from "@/components/navigation/SmartLink"
import { getRentSummary } from "../data"
import { CalendarDays, Clock, RefreshCcw } from "lucide-react"

export async function NextRentCard() {
  const summary = await getRentSummary()
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(summary.amount)
  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(summary.balance)

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
              <p className="text-sm font-medium">
                Last paid {new Date(summary.lastPaymentDate).toLocaleDateString(undefined, {
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
