import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardAudience, getUpcomingBookings } from "../data"
import { CalendarCheck } from "lucide-react"

const statusCopy: Record<"confirmed" | "pending" | "waitlisted", { label: string; variant: "secondary" | "outline" | "destructive" }>
  = {
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
  const [bookings, audience] = await Promise.all([
    getUpcomingBookings(),
    getDashboardAudience(),
  ])

  const title =
    audience === "manager"
      ? "Upcoming portfolio events"
      : "Upcoming amenity bookings"
  const description =
    audience === "manager"
      ? "Coordinate inspections, move-ins, and amenity holds across your properties."
      : "Coordinate shared spaces without double-booking."
  const emptyCopy =
    audience === "manager"
      ? "No scheduled events yet. Add inspections or amenity holds to stay organized."
      : "No upcoming bookings yet. Reserve an amenity to keep your roommates in the loop."
  const ctaLabel = audience === "manager" ? "Open calendar" : "Manage bookings"

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="size-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.length ? (
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
                      <p className="text-sm font-medium text-foreground">{booking.amenity}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.location}
                        {" • "}
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
        ) : (
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        )}

        <SmartLink href="/schedule" className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            {ctaLabel}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
