import { Suspense } from "react"

import { AMENITY_ICON_MAP, groupAmenitiesByProperty } from "@/lib/bookings/amenity-catalog"
import { getCurrentUserRole } from "@/lib/current-user-role"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PortalPageBlueprint } from "@/components/layouts/portal-page-blueprint"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AmenityBookingForm } from "./components/amenity-booking-form"
import { BookingHistory } from "./components/booking-history"
import { BookingStats } from "./components/booking-stats"

const amenitiesByProperty = groupAmenitiesByProperty()

export default async function BookingsPage() {
  const role = await getCurrentUserRole()
  const isManager = role === "property_manager" || role === "admin"

  const amenityCount = Object.values(amenitiesByProperty).reduce(
    (sum, amenities) => sum + amenities.length,
    0
  )

  return (
    <div className="container max-w-7xl space-y-8 py-10">
      <PortalPageBlueprint
        title="Amenity Bookings"
        description="Book shared amenities with Cal.com embeds while keeping policy checks and mirrored booking records in Supabase."
        metrics={[
          {
            label: "Properties",
            value: `${Object.keys(amenitiesByProperty).length}`,
            helperText: "Amenity catalogs grouped by property",
          },
          {
            label: "Bookable amenities",
            value: `${amenityCount}`,
            helperText: "Kitchen, TV room, parking, and shared devices",
          },
          {
            label: "Sync model",
            value: "Realtime",
            helperText: "Cal.com webhook events mirror to Supabase",
          },
        ]}
        primaryActionTitle={
          isManager
            ? "Coordinate amenity operations"
            : "Reserve your next amenity slot"
        }
        primaryActionDescription={
          isManager
            ? "Review calendars, reduce conflicts, and keep shared spaces available for all units."
            : "Launch the amenity catalog and secure an available slot before it fills up."
        }
        primaryCta={
          isManager
            ? { label: "Review booking calendars", href: "#booking-history" }
            : { label: "Open amenity catalog", href: "#amenity-catalog" }
        }
        fallbackCta={
          isManager
            ? { label: "Inspect booking stats", href: "#booking-stats" }
            : { label: "View your booking history", href: "#booking-history" }
        }
        supportModules={[
          {
            title: "Conflict safeguards",
            description:
              "Recurring reservations and overlap checks run before submission to prevent double-booking.",
          },
          {
            title: "Cancellation windows",
            description:
              "Calendar views expose policy-based cancellation eligibility for tenants and managers.",
          },
        ]}
      />

      <section id="booking-stats">
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 w-3/4 rounded bg-muted"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-1/2 rounded bg-muted"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <BookingStats />
        </Suspense>
      </section>

      <Tabs defaultValue="book" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="book">Amenity catalog</TabsTrigger>
          <TabsTrigger value="history">Calendars</TabsTrigger>
        </TabsList>

        <TabsContent id="amenity-catalog" value="book" className="space-y-6">
          {Object.entries(amenitiesByProperty).map(([propertyName, amenities]) => (
            <section key={propertyName} className="space-y-4 border-t pt-6 first:border-none first:pt-0">
              <div>
                <h2 className="text-xl font-semibold">{propertyName}</h2>
                <p className="text-sm text-muted-foreground">
                  Embedded Cal.com schedules scoped to this property&apos;s amenities.
                </p>
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

        <TabsContent id="booking-history" value="history" className="space-y-6">
          <BookingHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
