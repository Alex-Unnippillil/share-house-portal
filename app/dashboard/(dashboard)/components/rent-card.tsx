import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchRentDueSummary } from "@/lib/dashboard-data"
import { formatDate, formatNumber } from "@/lib/utils"
import Link from "next/link"

export async function RentCard() {
  const rent = await fetchRentDueSummary()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next rent due</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">Amount</div>
        <div className="text-2xl font-semibold">{formatNumber(rent.amountDue)}</div>
        <div className="text-sm text-muted-foreground">
          Due on {formatDate(rent.dueDate)}
          {rent.autopayEnabled ? " • Autopay scheduled" : ""}
        </div>
        {rent.outstandingBalance > 0 ? (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Outstanding balance {formatNumber(rent.outstandingBalance)}
          </div>
        ) : null}
        <Link href="/payments" className="inline-block">
          <Button size="sm">View details</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
