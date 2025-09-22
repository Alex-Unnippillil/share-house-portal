import { Suspense } from "react"
import {
  Calendar,
  Car,
  Gamepad2,
  Monitor,
  Tv,
  UtensilsCrossed,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AmenityBookingForm } from "./components/amenity-booking-form"
import { BookingHistory } from "./components/booking-history"
import { BookingStats, BookingStatsSkeleton } from "./components/booking-stats"

const amenities = [
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Book the kitchen for cooking or meal prep",
    icon: UtensilsCrossed,
    duration: "2 hours",
    maxAdvance: "7 days",
  },
  {
    id: "tv-room",
    name: "TV Room",
    description: "Reserve the living room TV for movies or gaming",
    icon: Tv,
    duration: "3 hours",
    maxAdvance: "7 days",
  },
  {
    id: "playstation",
    name: "PlayStation Nook",
    description: "Book the gaming area for console gaming",
    icon: Gamepad2,
    duration: "2 hours",
    maxAdvance: "7 days",
  },
  {
    id: "parking",
    name: "Parking Spot",
    description: "Reserve a visitor parking spot",
    icon: Car,
    duration: "24 hours",
    maxAdvance: "14 days",
  },
  {
    id: "computer",
    name: "Shared Computer",
    description: "Use the shared computer workstation",
    icon: Monitor,
    duration: "1 hour",
    maxAdvance: "3 days",
  },
]

export default function BookingsPage() {
  return (
    <div className="container max-w-7xl space-y-8 py-8">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Amenity Bookings
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Reserve shared amenities like the kitchen, TV room, parking, and
            more. Bookings are managed through our Cal.com integration.
          </p>
        </div>
        <Separator />
      </header>

      {/* Stats Overview */}
      <Suspense fallback={<BookingStatsSkeleton />}>
        <BookingStats />
      </Suspense>

      {/* Main Content Tabs */}
      <Tabs defaultValue="book" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="book">Book Amenity</TabsTrigger>
          <TabsTrigger value="history">Booking History</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {amenities.map(({ icon: Icon, ...amenity }) => (
              <Card
                key={amenity.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Icon className="size-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{amenity.name}</CardTitle>
                      <CardDescription>{amenity.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Duration: {amenity.duration}</span>
                    <span>Max advance: {amenity.maxAdvance}</span>
                  </div>
                  <AmenityBookingForm amenity={amenity} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <BookingHistory />
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">
                Smart Scheduling
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Automated conflict detection and recurring booking support.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Tv className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">
                Real-time Availability
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              See live availability and get instant confirmation for bookings.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Fair Usage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Booking limits prevent overuse while ensuring everyone gets
              access.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Car className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">
                Mobile Friendly
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Book amenities on-the-go with our responsive mobile interface.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
