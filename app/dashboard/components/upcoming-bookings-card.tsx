"use client"

import { format, parseISO } from "date-fns"
import { CalendarDays } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { BookingRow } from "../lib/types"

type UpcomingBookingsCardProps = {
  bookings: BookingRow[]
  canView: boolean
}

export function UpcomingBookingsCard({
  bookings,
  canView,
}: UpcomingBookingsCardProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" />
          Upcoming Amenity Bookings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {canView ? (
          bookings.length ? (
            <ScrollArea className="h-[260px] pr-4">
              <ul className="space-y-4 text-sm">
                {bookings.map((booking) => (
                  <li key={booking.id} className="space-y-1 border-b pb-3 last:border-b-0 last:pb-0">
                    <p className="font-semibold text-foreground">
                      {booking.title ?? booking.amenities?.name ?? "Amenity booking"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(booking.starts_at, booking.ends_at)}
                    </p>
                    {booking.status && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {booking.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming reservations for this building.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Amenity scheduling is hidden for your role.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function formatDateRange(start: string, end: string) {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()

  if (sameDay) {
    return `${format(startDate, "EEE MMM d, p")} – ${format(endDate, "p")}`
  }

  return `${format(startDate, "EEE MMM d, p")} → ${format(endDate, "EEE MMM d, p")}`
}

