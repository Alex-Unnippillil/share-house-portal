"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Cal, { getCalApi, type EmbedEvent } from "@calcom/embed-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import type { Database } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const CAL_NAMESPACE = "amenity-booking"
const CAL_ORIGIN = process.env.NEXT_PUBLIC_CALCOM_EMBED_HOST ?? "https://cal.com"

type Amenity = Database["public"]["Tables"]["amenities"]["Row"]
type BookingSummary = Pick<
  Database["public"]["Tables"]["amenity_bookings"]["Row"],
  "id" | "amenity_id" | "tenant_id" | "start_time" | "end_time" | "status" | "notes"
>

type BookingEvent =
  | EmbedEvent<"bookingSuccessfulV2">
  | EmbedEvent<"rescheduleBookingSuccessfulV2">

interface AmenitiesClientProps {
  amenities: Amenity[]
  userId: string
}

export function AmenitiesClient({ amenities, userId }: AmenitiesClientProps) {
  const [activeAmenity, setActiveAmenity] = useState<Amenity | null>(
    amenities[0] ?? null
  )
  const [isLogging, setIsLogging] = useState(false)
  const [activeConflictNote, setActiveConflictNote] = useState<string | null>(
    null
  )
  const calApiRef = useRef<Awaited<ReturnType<typeof getCalApi>> | null>(null)
  const conflictAbortRef = useRef<AbortController | null>(null)

  const amenitiesByEventType = useMemo(() => {
    const map = new Map<number, Amenity>()
    for (const amenity of amenities) {
      if (amenity.calcom_event_type_id !== null) {
        map.set(amenity.calcom_event_type_id, amenity)
      }
    }
    return map
  }, [amenities])

  const ensureCalApi = useCallback(async () => {
    if (calApiRef.current) {
      return calApiRef.current
    }
    const cal = await getCalApi({ namespace: CAL_NAMESPACE })
    cal("ui", {
      theme: "auto",
      styles: {
        branding: {
          brandColor: "#1f2937",
        },
      },
    })
    calApiRef.current = cal
    return cal
  }, [])

  const refreshActiveAmenityConflicts = useCallback(
    async (amenity: Amenity | null) => {
      if (!amenity) {
        conflictAbortRef.current?.abort()
        conflictAbortRef.current = null
        setActiveConflictNote(null)
        return
      }

      conflictAbortRef.current?.abort()
      const controller = new AbortController()
      conflictAbortRef.current = controller

      try {
        const response = await fetch(
          `/api/amenities/bookings?amenityId=${encodeURIComponent(amenity.id)}`,
          { signal: controller.signal }
        )

        const payload = (await response
          .json()
          .catch(() => null)) as
          | { data?: BookingSummary[]; error?: string }
          | null

        if (!response.ok || !payload) {
          const message =
            typeof payload?.error === "string"
              ? payload.error
              : "Unable to load conflict notes"
          throw new Error(message)
        }

        const conflict = Array.isArray(payload.data)
          ? payload.data.find(
              (entry) =>
                typeof entry?.notes === "string" && entry.notes.trim().length > 0
            )
          : null

        setActiveConflictNote(conflict?.notes ?? null)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        setActiveConflictNote(null)
        toast({
          title: "Conflict status unavailable",
          description:
            error instanceof Error
              ? error.message
              : "We couldn't load the latest conflict details.",
          variant: "destructive",
        })
      } finally {
        if (!controller.signal.aborted) {
          conflictAbortRef.current = null
        }
      }
    },
    []
  )

  const handleSuccess = useCallback(
    async (event: BookingEvent) => {
      const data = event.detail.data
      if (!data?.uid || !data?.startTime || !data?.endTime) {
        return
      }

      const amenity = data.eventTypeId
        ? amenitiesByEventType.get(data.eventTypeId)
        : null

      if (!amenity) {
        toast({
          title: "Unknown amenity",
          description: "The scheduled event could not be matched to an amenity.",
          variant: "destructive",
        })
        return
      }

      try {
        setIsLogging(true)
        const response = await fetch("/api/amenities/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amenityId: amenity.id,
            userId,
            booking: {
              uid: data.uid,
              startTime: data.startTime,
              endTime: data.endTime,
              eventTypeId: data.eventTypeId ?? amenity.calcom_event_type_id,
              status: data.status ?? "confirmed",
            },
          }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: null }))
          throw new Error(body?.error ?? "Unable to log booking")
        }

        toast({
          title: "Booking confirmed",
          description: `${amenity.name} is reserved for ${new Date(
            data.startTime
          ).toLocaleString()}.`,
        })
        void refreshActiveAmenityConflicts(amenity)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving the booking."
        toast({
          title: "Failed to save booking",
          description: message,
          variant: "destructive",
        })
      } finally {
        setIsLogging(false)
      }
    },
    [amenitiesByEventType, refreshActiveAmenityConflicts, userId]
  )

  const handleCancel = useCallback(
    (event: EmbedEvent<"bookingCancelled">) => {
      const data = event.detail.data
      if (!data) return
      const eventTypeId = (data as { eventType?: { id?: number | string } }).eventType?.id
      const numericId =
        typeof eventTypeId === "string"
          ? Number.parseInt(eventTypeId, 10)
          : eventTypeId ?? undefined
      const amenity =
        numericId !== undefined
          ? amenitiesByEventType.get(numericId)
          : null
      if (amenity) {
        toast({
          title: "Booking cancelled",
          description: `${amenity.name} booking was cancelled. We'll sync updates shortly.`,
        })
      }
    },
    [amenitiesByEventType]
  )

  const handleLegacySuccess = useCallback(
    (event: EmbedEvent<"bookingSuccessful">) => {
      handleSuccess(event as unknown as BookingEvent)
    },
    [handleSuccess]
  )

  useEffect(() => {
    let isMounted = true
    let localCal: Awaited<ReturnType<typeof getCalApi>> | null = null

    void (async () => {
      const cal = await ensureCalApi()
      if (!isMounted) return
      localCal = cal
      cal("on", { action: "bookingSuccessfulV2", callback: handleSuccess })
      cal("on", { action: "bookingSuccessful", callback: handleLegacySuccess })
      cal("on", {
        action: "rescheduleBookingSuccessfulV2",
        callback: handleSuccess,
      })
      cal("on", { action: "bookingCancelled", callback: handleCancel })
    })()

    return () => {
      isMounted = false
      if (localCal) {
        localCal("off", { action: "bookingSuccessfulV2", callback: handleSuccess })
        localCal("off", { action: "bookingSuccessful", callback: handleLegacySuccess })
        localCal("off", {
          action: "rescheduleBookingSuccessfulV2",
          callback: handleSuccess,
        })
        localCal("off", { action: "bookingCancelled", callback: handleCancel })
      }
    }
  }, [ensureCalApi, handleCancel, handleLegacySuccess, handleSuccess])

  const openModal = useCallback(
    async (amenity: Amenity) => {
      setActiveAmenity(amenity)
      void refreshActiveAmenityConflicts(amenity)
      const cal = await ensureCalApi()
      cal("modal", { calLink: amenity.calcom_event_slug, calOrigin: CAL_ORIGIN })
    },
    [ensureCalApi, refreshActiveAmenityConflicts]
  )

  useEffect(() => {
    void refreshActiveAmenityConflicts(activeAmenity)
  }, [activeAmenity, refreshActiveAmenityConflicts])

  useEffect(() => {
    return () => {
      conflictAbortRef.current?.abort()
    }
  }, [])

  if (!amenities.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No amenities configured</CardTitle>
          <CardDescription>
            Property managers need to configure amenities in Supabase before tenants
            can schedule time slots.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const amenityCards = amenities.map((amenity) => {
    const isActive = amenity.id === activeAmenity?.id
    const label = amenity.slug ? amenity.slug.replace(/-/g, " ") : amenity.name

    return (
      <Card key={amenity.id} className={cn(isActive && "ring-2 ring-primary")}>
        <CardHeader>
          <CardTitle>{amenity.name}</CardTitle>
          <CardDescription>
            {amenity.description ?? "Reserve this shared amenity through Cal.com."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Button
            variant={isActive ? "default" : "outline"}
            onClick={() => void openModal(amenity)}
            disabled={isLogging}
          >
            Book
          </Button>
        </CardFooter>
      </Card>
    )
  })

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {amenityCards}
        </div>
      </div>
      <div className="lg:w-1/2">
        {activeAmenity ? (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{activeAmenity.name} availability</CardTitle>
              <CardDescription>
                Browse open slots and confirm a booking directly inside the widget.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeConflictNote ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">Heads up</p>
                  <p className="mt-1 whitespace-pre-wrap leading-snug">
                    {activeConflictNote}
                  </p>
                </div>
              ) : null}
              <Cal
                key={activeAmenity.id}
                namespace={CAL_NAMESPACE}
                calLink={activeAmenity.calcom_event_slug}
                calOrigin={CAL_ORIGIN}
                style={{ minHeight: "600px" }}
                config={{
                  layout: "month_view",
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select an amenity</CardTitle>
              <CardDescription>
                Choose an amenity to preview availability and book a slot.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
