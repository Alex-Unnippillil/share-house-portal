import { Suspense } from "react"
import { Calendar, ShieldAlert, Tv } from "lucide-react"

import { AMENITY_ICON_MAP, groupAmenitiesByProperty } from "@/lib/bookings/amenity-catalog"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FlowStateCard } from "@/components/feedback/flow-state"
import { PageShell } from "@/components/layout/page-shell"

import { AmenityBookingForm } from "./components/amenity-booking-form"
import { BookingHistory } from "./components/booking-history"
import { BookingStats } from "./components/booking-stats"

const amenitiesByProperty = groupAmenitiesByProperty()

export default function BookingsPage() {
  return (
    <PageShell
      title="Amenity Bookings"
      description="Browse amenity catalogs by property and book directly inside Cal.com embeds. Bookings are mirrored to Supabase for policy checks, conflict detection, and role-based calendars."
      maxWidthClassName="max-w-7xl"
    >

      <Suspense
        fallback={
          <FlowStateCard
            variant="loading"
            title="Loading booking analytics"
            description="We're pulling utilization, conflict, and upcoming reservation snapshots for this property."
          />
        }
      >
        <BookingStats />
      </Suspense>

      <Tabs defaultValue="book" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="book">Amenity catalog</TabsTrigger>
          <TabsTrigger value="history">Calendars</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="space-y-6">
          {Object.entries(amenitiesByProperty).map(([propertyName, amenities]) => (
            <section key={propertyName} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{propertyName}</h2>
                <p className="text-sm text-muted-foreground">Embedded Cal.com schedules scoped to this property&apos;s amenities.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {amenities.map((amenity) => {
                  const Icon = AMENITY_ICON_MAP[amenity.iconName]

                  return (
                    <Card key={amenity.id} className="transition-shadow hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <Icon className="size-6 text-primary" />
                          <div>
                            <CardTitle className="text-lg">{amenity.amenityName}</CardTitle>
                            <CardDescription>{amenity.amenityDescription}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <AmenityBookingForm amenity={amenity} />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <BookingHistory />
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Cal.com webhooks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Booking create, reschedule, and cancellation events sync into the `bookings` mirror table.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Tv className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Conflict detection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Policy guardrails validate recurring reservations and check overlap before tenants submit bookings.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Cancellation rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Tenant and manager calendars display booking status plus cancellation eligibility by policy window.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
