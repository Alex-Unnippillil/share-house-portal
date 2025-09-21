import { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Bookings",
  description: "Reserve shared amenities and manage overnight guests.",
}

const bookingHighlights = [
  {
    title: "Amenity calendar",
    description:
      "Browse real-time availability for the kitchen, TV room, gaming nook, parking spots, and shared office space.",
  },
  {
    title: "Conflict prevention",
    description:
      "Cal.com sync ensures overlapping requests are rejected and notifies roommates when new holds are created.",
  },
  {
    title: "Visitor registry",
    description:
      "Log overnight guests with arrival details, approvals, and automatic reminders about stay limits.",
  },
]

export default function BookingsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Amenity bookings</h1>
        <p className="text-muted-foreground">
          Coordinate household resources without endless group chats. Confirmed reservations sync directly from Cal.com so everyone
          stays aligned.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bookingHighlights.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Detailed booking histories help property managers audit amenity usage and enforce household policies.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
