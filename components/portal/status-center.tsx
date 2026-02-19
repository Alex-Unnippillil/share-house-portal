import { AlertTriangle, CalendarClock, Receipt } from "lucide-react"

import { StatusBadge } from "@/components/patterns/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type StatusCenterProps = {
  rentStatus: "paid" | "pending" | "failed"
  rentLabel: string
  unresolvedMaintenanceCount: number
  bookingConflictCount: number
}

export function StatusCenter({
  rentStatus,
  rentLabel,
  unresolvedMaintenanceCount,
  bookingConflictCount,
}: StatusCenterProps) {
  const maintenanceStatus = unresolvedMaintenanceCount > 0 ? "open" : "resolved"
  const bookingStatus = bookingConflictCount > 0 ? "conflict" : "confirmed"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Status Center</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Receipt className="size-3.5" />
            Due rent state
          </p>
          <div className="flex items-center justify-between gap-2">
            <StatusBadge domain="payment" status={rentStatus} />
            <span className="text-xs text-muted-foreground">{rentLabel}</span>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5" />
            Unresolved maintenance
          </p>
          <div className="flex items-center justify-between gap-2">
            <StatusBadge domain="maintenance" status={maintenanceStatus} />
            <span className="text-xs text-muted-foreground">{unresolvedMaintenanceCount} open</span>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Booking conflicts
          </p>
          <div className="flex items-center justify-between gap-2">
            <StatusBadge domain="booking" status={bookingStatus} />
            <span className="text-xs text-muted-foreground">{bookingConflictCount} upcoming</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
