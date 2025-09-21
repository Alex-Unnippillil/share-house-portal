import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { AmenityBookingSummary } from "../lib/data-sources"

type UpcomingBookingsCardProps = {
  bookings: AmenityBookingSummary[]
}

export function UpcomingBookingsCard({ bookings }: UpcomingBookingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Amenity bookings</CardTitle>
        <CardDescription>
          Upcoming five reservations across shared amenities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {bookings.map((booking) => (
            <li key={booking.id} className={cn("border border-border p-3", "rounded-md")}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{booking.amenityName}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.startTime), "MMM d, h:mma")} – {format(new Date(booking.endTime), "h:mma")}
                  </p>
                  {booking.residentName ? (
                    <p className="text-xs text-muted-foreground">Hosted by {booking.residentName}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="whitespace-nowrap capitalize">
                  {booking.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </li>
          ))}
          {bookings.length === 0 ? (
            <li
              className={cn(
                "border border-dashed border-border p-4 text-center text-muted-foreground",
                "rounded-md"
              )}
            >
              No upcoming bookings.
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}
