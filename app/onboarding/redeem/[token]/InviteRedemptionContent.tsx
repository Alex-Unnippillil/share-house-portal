"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarCheck, Home, MapPin, Bed, Bath, Ruler } from "lucide-react"

import { InviteContextProvider, useInviteContext } from "./InviteContext"
import { InviteRedemptionForm } from "./InviteRedemptionForm"
import { InviteRouteMetrics } from "./InviteRouteMetrics"
import type { InvitePrefetchContext } from "./types"

const formatAddress = (context: InvitePrefetchContext) => {
  const { property } = context
  const line2 = property.addressLine2 ? `, ${property.addressLine2}` : ""
  const localityParts = [property.city, property.state, property.postalCode].filter(Boolean)
  const locality = localityParts.length ? `, ${localityParts.join(", ")}` : ""
  return `${property.addressLine1}${line2}${locality}`
}

function PropertyOverview() {
  const context = useInviteContext()
  const unit = context.unit
  const property = context.property
  const formattedAddress = formatAddress(context)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="size-5" />
          {property.name}
        </CardTitle>
        <CardDescription>
          {context.invitedByName
            ? `${context.invitedByName} invited you to join this household.`
            : "You’re joining this household."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 size-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{formattedAddress}</p>
            {property.timezone ? (
              <p className="text-muted-foreground">Timezone: {property.timezone}</p>
            ) : null}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="font-medium">Unit {unit.label}</p>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            {typeof unit.bedrooms === "number" ? (
              <span className="inline-flex items-center gap-1">
                <Bed className="size-4" /> {unit.bedrooms} bedrooms
              </span>
            ) : null}
            {typeof unit.bathrooms === "number" ? (
              <span className="inline-flex items-center gap-1">
                <Bath className="size-4" /> {unit.bathrooms} baths
              </span>
            ) : null}
            {typeof unit.floorArea === "number" ? (
              <span className="inline-flex items-center gap-1">
                <Ruler className="size-4" /> {unit.floorArea} sq ft
              </span>
            ) : null}
            {unit.availableFrom ? (
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="size-4" /> Available {unit.availableFrom}
              </span>
            ) : null}
          </div>
        </div>

        {context.notes ? (
          <div className="rounded-md bg-muted p-3 text-muted-foreground">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invite note</p>
            <p>{context.notes}</p>
          </div>
        ) : null}

        {property.amenities.length ? (
          <div className="space-y-2">
            <p className="font-medium">Household amenities</p>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

type InviteRedemptionContentProps = {
  context: InvitePrefetchContext
}

export default function InviteRedemptionContent({ context }: InviteRedemptionContentProps) {
  return (
    <InviteContextProvider value={context}>
      <InviteRouteMetrics route="onboarding/redeem" serverTimestamp={context.serverRenderedAt} />
      <div className="container max-w-6xl space-y-10 py-12">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Complete your Roomsily onboarding
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            {context.invitedByName
              ? `${context.invitedByName} invited you to Unit ${context.unit.label} at ${context.property.name}.`
              : `You’re joining Unit ${context.unit.label} at ${context.property.name}.`}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Tell us about yourself</CardTitle>
              <CardDescription>
                Confirm your contact information and acknowledge the household policies to unlock your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteRedemptionForm />
            </CardContent>
          </Card>

          <PropertyOverview />
        </div>
      </div>
    </InviteContextProvider>
  )
}
