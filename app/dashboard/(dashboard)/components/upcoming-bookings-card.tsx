import { CalendarCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SmartLink from "@/components/navigation/SmartLink"

import { getUpcomingBookings } from "../data"

const statusCopy: Record<
  "confirmed" | "pending" | "waitlisted",
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  confirmed: {
    label: "Confirmed",
    variant: "secondary",
  },
  pending: {
    label: "Awaiting approval",
    variant: "outline",
  },
  waitlisted: {
    label: "Waitlisted",
    variant: "destructive",
  },
}

export async function UpcomingBookingsCard() {
  const bookings = await getUpcomingBookings()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="size-5 text-primary" />
            Upcoming amenity bookings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Coordinate shared spaces without double-booking.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const { label, variant } = statusCopy[booking.status]
            return (
              <li
                key={booking.id}
                className="rounded-lg border border-border/60 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {booking.amenity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {" • "}
                      {booking.timeframe}
                    </p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>
              </li>
            )
          })}
        </ul>

        <SmartLink href="/schedule" className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Manage bookings
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
