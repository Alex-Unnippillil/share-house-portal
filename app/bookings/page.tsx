import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const bookingHighlights = [
  {
    title: "Amenity scheduling",
    description:
      "Reserve the kitchen, TV lounge, parking spot, or gaming nook without double-booking roommates.",
  },
  {
    title: "Recurring reservations",
    description:
      "Set weekly chore slots or study sessions with automatic conflict detection and notifications.",
  },
  {
    title: "Visitor management",
    description:
      "Log overnight guests and share itineraries with roommates and property managers instantly.",
  },
  {
    title: "Real-time updates",
    description:
      "Sync bookings from Cal.com directly into the portal so everyone sees the same availability grid.",
  },
]

export default function BookingsPage() {
  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bookings</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Coordinate shared amenities and guest stays with collaborative schedules that respect each roommate plan.
          </p>
        </div>
        <Separator />
        <Link
          href="/schedule"
          className={buttonVariants({ variant: "secondary" })}
        >
          Open amenity calendar
        </Link>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {bookingHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
