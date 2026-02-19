import { Suspense } from "react"
import { Calendar, ShieldAlert, Tv } from "lucide-react"

import {
  AMENITY_ICON_MAP,
  groupAmenitiesByProperty,
} from "@/lib/bookings/amenity-catalog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageSection,
  PageTitle,
  SectionDescription,
  SectionTitle,
} from "@/components/ui/page-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AmenityBookingForm } from "./components/amenity-booking-form"
import { BookingHistory } from "./components/booking-history"
import { BookingStats } from "./components/booking-stats"

const amenitiesByProperty = groupAmenitiesByProperty()

export default function BookingsPage() {
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Amenity Bookings</PageTitle>
        <PageDescription>
          Browse amenity catalogs by property and book directly inside Cal.com
          embeds. Bookings are mirrored to Supabase for policy checks, conflict
          detection, and role-based calendars.
        </PageDescription>
      </PageHeader>

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

      <Tabs defaultValue="book" className="space-y-stack-lg">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="book">Amenity catalog</TabsTrigger>
          <TabsTrigger value="history">Calendars</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="space-y-stack-lg">
          {Object.entries(amenitiesByProperty).map(
            ([propertyName, amenities]) => (
              <PageSection key={propertyName}>
                <div>
                  <SectionTitle>{propertyName}</SectionTitle>
                  <SectionDescription>
                    Embedded Cal.com schedules scoped to this property&apos;s
                    amenities.
                  </SectionDescription>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {amenities.map((amenity) => {
                    const Icon = AMENITY_ICON_MAP[amenity.iconName]

                    return (
                      <Card key={amenity.id} surface="glass" interactive>
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            <Icon className="size-6 text-primary" />
                            <div>
                              <CardTitle className="text-heading-sm">
                                {amenity.amenityName}
                              </CardTitle>
                              <CardDescription>
                                {amenity.amenityDescription}
                              </CardDescription>
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
              </PageSection>
            )
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-stack-lg">
          <BookingHistory />
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-3">
        <Card surface="elevated" interactive>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="size-5 text-primary" />
              <CardTitle className="text-body-sm">Cal.com webhooks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-body-sm">
              Booking create, reschedule, and cancellation events sync into the
              `bookings` mirror table.
            </CardDescription>
          </CardContent>
        </Card>

        <Card surface="elevated" interactive>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Tv className="size-5 text-primary" />
              <CardTitle className="text-body-sm">Conflict detection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-body-sm">
              Policy guardrails validate recurring reservations and check
              overlap before tenants submit bookings.
            </CardDescription>
          </CardContent>
        </Card>

        <Card surface="elevated" interactive>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="size-5 text-primary" />
              <CardTitle className="text-body-sm">Cancellation rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-body-sm">
              Tenant and manager calendars display booking status plus
              cancellation eligibility by policy window.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
