import { canCancelBooking } from "@/lib/bookings/policy"
import { createClient } from "@/utils/supabase/server"

import { FlowStateCard } from "@/components/feedback/flow-state"
import { SemanticStatusBadge } from "@/components/status/semantic-status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function formatRange(startTime: string, endTime: string) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} • ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`
}

function statusTone(status: string): "success" | "neutral" | "error" | "warning" {
  if (status === "confirmed") return "success"
  if (status === "pending") return "neutral"
  if (status === "cancelled") return "error"
  return "warning"
}

export async function BookingHistory() {
  const supabase = createClient()

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, property_id, amenity_name, status, start_time, end_time")
    .order("start_time", { ascending: false })
    .limit(24)

  const tenantRows = (bookings ?? []).slice(0, 10)
  const managerRows = bookings ?? []

  const renderRows = (rows: typeof tenantRows, role: "tenant" | "manager") => {
    if (rows.length === 0) {
      return (
        <FlowStateCard
          variant="empty"
          title="No booking activity yet"
          description="Once bookings are mirrored from Cal.com, this calendar will show status, cancellation policy, and property context."
        />
      )
    }

    return (
      <div className="space-y-3">
        {rows.map((booking) => {
          const cancellable = canCancelBooking(booking.start_time, role === "manager" ? 0 : 2)
          return (
            <Card key={`${role}-${booking.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{booking.amenity_name}</span>
                  <SemanticStatusBadge status={statusTone(booking.status)} label={booking.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{formatRange(booking.start_time, booking.end_time)}</p>
                <p>Property: {booking.property_id}</p>
                <p>
                  {cancellable
                    ? "Cancellation allowed within current policy window."
                    : "Cancellation locked because the start time is within the tenant policy window."}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <Tabs defaultValue="tenant" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tenant">Tenant calendar</TabsTrigger>
        <TabsTrigger value="manager">Manager calendar</TabsTrigger>
      </TabsList>

      <TabsContent value="tenant">{renderRows(tenantRows, "tenant")}</TabsContent>
      <TabsContent value="manager">{renderRows(managerRows, "manager")}</TabsContent>
    </Tabs>
  )
}
