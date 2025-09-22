"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { AlertCircle, Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Database } from "@/lib/supabase"

type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"]
type BookingRow = Database["public"]["Tables"]["amenity_bookings"]["Row"]

type AmenityWithBookings = AmenityRow & {
  amenity_bookings: Pick<BookingRow, "id" | "start_time" | "end_time" | "attendee_count">[]
}

type SubmissionState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string }

const SLOT_MINUTES = 30
const ONE_HOUR_IN_MS = 60 * 60 * 1000

function roundToNextSlot(date: Date, minutes: number = SLOT_MINUTES) {
  const ms = minutes * 60 * 1000
  return new Date(Math.ceil(date.getTime() / ms) * ms)
}

function formatForInput(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

function toIso(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function createDemoAmenities(): AmenityWithBookings[] {
  const now = new Date()
  const firstSlot = roundToNextSlot(now)
  const kitchenStart = new Date(firstSlot.getTime() + ONE_HOUR_IN_MS)
  const studioStart = new Date(firstSlot.getTime() + 2 * ONE_HOUR_IN_MS)

  return [
    {
      id: "demo-kitchen",
      name: "Kitchen",
      description: "Plan meal prep or community dinners without double-booking.",
      capacity: 4,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      amenity_bookings: [
        {
          id: "demo-kitchen-1",
          start_time: kitchenStart.toISOString(),
          end_time: new Date(kitchenStart.getTime() + ONE_HOUR_IN_MS).toISOString(),
          attendee_count: 2,
        },
      ],
    },
    {
      id: "demo-studio",
      name: "Wellness Studio",
      description: "Reserve yoga or fitness time with roommates.",
      capacity: 6,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      amenity_bookings: [
        {
          id: "demo-studio-1",
          start_time: studioStart.toISOString(),
          end_time: new Date(studioStart.getTime() + ONE_HOUR_IN_MS).toISOString(),
          attendee_count: 3,
        },
      ],
    },
  ]
}

const demoAmenities = createDemoAmenities()

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function AmenityBookingForm() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }, [supabaseUrl, supabaseAnonKey])

  const [amenities, setAmenities] = useState<AmenityWithBookings[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(null)

  const defaultStart = useMemo(() => {
    const nextSlot = roundToNextSlot(new Date())
    return formatForInput(nextSlot)
  }, [])

  const defaultEnd = useMemo(() => {
    const nextSlot = roundToNextSlot(new Date())
    return formatForInput(new Date(nextSlot.getTime() + ONE_HOUR_IN_MS))
  }, [])

  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)
  const [attendeeCount, setAttendeeCount] = useState(1)
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ type: "idle" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const usingDemoData = !supabase

  useEffect(() => {
    let ignore = false

    async function loadAmenities() {
      setLoading(true)
      if (!supabase) {
        if (!ignore) {
          setAmenities(
            demoAmenities.map((amenity) => ({
              ...amenity,
              amenity_bookings: [...amenity.amenity_bookings],
            })),
          )
          setSelectedAmenityId(demoAmenities[0]?.id ?? null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from("amenities")
        .select(
          "id, name, description, capacity, created_at, updated_at, amenity_bookings(id, start_time, end_time, attendee_count)",
        )
        .order("name")

      if (ignore) {
        return
      }

      if (error) {
        setSubmissionState({ type: "error", message: error.message })
        setAmenities([])
        setSelectedAmenityId(null)
      } else {
        const loadedAmenities = (data ?? []).map((amenity) => ({
          ...amenity,
          amenity_bookings: amenity.amenity_bookings ?? [],
        })) as AmenityWithBookings[]
        setAmenities(loadedAmenities)
        setSelectedAmenityId(loadedAmenities[0]?.id ?? null)
      }

      setLoading(false)
    }

    void loadAmenities()

    return () => {
      ignore = true
    }
  }, [supabase])

  const selectedAmenity = useMemo(
    () => amenities.find((amenity) => amenity.id === selectedAmenityId) ?? null,
    [amenities, selectedAmenityId],
  )

  const overlappingBookings = useMemo(() => {
    if (!selectedAmenity) {
      return [] as AmenityWithBookings["amenity_bookings"]
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return []
    }

    return selectedAmenity.amenity_bookings.filter((booking) => {
      const bookingStart = new Date(booking.start_time)
      const bookingEnd = new Date(booking.end_time)
      return bookingStart < end && start < bookingEnd
    })
  }, [selectedAmenity, startTime, endTime])

  const usedSlots = overlappingBookings.reduce((total, booking) => total + (booking.attendee_count ?? 1), 0)
  const remainingSlots = selectedAmenity ? Math.max(selectedAmenity.capacity - usedSlots, 0) : 0

  useEffect(() => {
    if (!selectedAmenity) {
      return
    }

    let nextCount = attendeeCount
    const capacityLimit = Math.max(selectedAmenity.capacity, 1)

    if (nextCount > capacityLimit) {
      nextCount = capacityLimit
    }

    if (remainingSlots > 0 && nextCount > remainingSlots) {
      nextCount = remainingSlots
    }

    if (remainingSlots === 0 && nextCount !== 1) {
      nextCount = 1
    }

    if (nextCount !== attendeeCount) {
      setAttendeeCount(nextCount)
    }
  }, [selectedAmenity, remainingSlots, attendeeCount])

  const upcomingReservations = useMemo(() => {
    if (!selectedAmenity) {
      return [] as AmenityWithBookings["amenity_bookings"]
    }

    const now = new Date()
    return [...selectedAmenity.amenity_bookings]
      .filter((booking) => new Date(booking.end_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 3)
  }, [selectedAmenity])

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const invalidTimeRange = !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate <= startDate

  const canSubmit =
    Boolean(supabase && selectedAmenity) &&
    !invalidTimeRange &&
    remainingSlots > 0 &&
    attendeeCount >= 1 &&
    attendeeCount <= remainingSlots

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedAmenity) {
      setSubmissionState({ type: "error", message: "Choose an amenity to continue." })
      return
    }

    if (!supabase) {
      setSubmissionState({
        type: "error",
        message: "Connect your Supabase project to confirm bookings from the portal.",
      })
      return
    }

    const startIso = toIso(startTime)
    const endIso = toIso(endTime)

    if (!startIso || !endIso) {
      setSubmissionState({ type: "error", message: "Provide both a start and end time." })
      return
    }

    if (invalidTimeRange) {
      setSubmissionState({ type: "error", message: "The end time must be after the start time." })
      return
    }

    setIsSubmitting(true)
    setSubmissionState({ type: "idle" })

    const { data, error } = await supabase
      .from("amenity_bookings")
      .insert({
        amenity_id: selectedAmenity.id,
        start_time: startIso,
        end_time: endIso,
        attendee_count: attendeeCount,
      })
      .select("id, start_time, end_time, attendee_count")
      .single()

    if (error) {
      setSubmissionState({ type: "error", message: error.message })
      setIsSubmitting(false)
      return
    }

    setSubmissionState({
      type: "success",
      message: `Reserved ${selectedAmenity.name} for ${attendeeCount} attendee${attendeeCount > 1 ? "s" : ""}.`,
    })

    setAmenities((current) =>
      current.map((amenity) =>
        amenity.id === selectedAmenity.id
          ? {
              ...amenity,
              amenity_bookings: [...amenity.amenity_bookings, data],
            }
          : amenity,
      ),
    )

    setIsSubmitting(false)
  }

  function renderStatus() {
    if (submissionState.type === "idle") {
      return null
    }

    const isError = submissionState.type === "error"

    return (
      <div
        className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
          isError ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-emerald-500/40 bg-emerald-500/10"
        }`}
      >
        {isError ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <Check className="mt-0.5 h-4 w-4" />}
        <span>{submissionState.message}</span>
      </div>
    )
  }

  const statusNode = renderStatus()

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Plan a shared amenity reservation</CardTitle>
        <CardDescription>
          Check remaining slots in real time and reserve for the full group when the capacity allows.
          {usingDemoData && " Demo data is shown until Supabase credentials are configured."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading amenity availability…</p>
        ) : amenities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No amenities found. Add amenities with capacity details in Supabase to enable reservations.
          </p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amenity">Amenity</Label>
                <select
                  id="amenity"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedAmenityId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedAmenityId(value.length > 0 ? value : null)
                  }}
                  disabled={isSubmitting}
                >
                  <option value="" disabled>
                    Select an amenity
                  </option>
                  {amenities.map((amenity) => (
                    <option key={amenity.id} value={amenity.id}>
                      {amenity.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Remaining slots</Label>
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={remainingSlots > 0 ? "secondary" : "destructive"}>{remainingSlots}</Badge>
                    <span className="text-muted-foreground">of {selectedAmenity?.capacity ?? 0} total</span>
                  </div>
                  {remainingSlots === 0 ? (
                    <span className="text-xs font-medium text-destructive">Fully booked</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Holds {selectedAmenity?.capacity ?? 0} people</span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  disabled={isSubmitting}
                  min={startTime}
                  required
                />
                {invalidTimeRange ? (
                  <p className="text-xs text-destructive">End time must be after the start time.</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="attendee-count">Attendees</Label>
                <Input
                  id="attendee-count"
                  type="number"
                  min={1}
                  max={selectedAmenity?.capacity ?? 1}
                  value={attendeeCount}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10)
                    if (Number.isNaN(parsed)) {
                      setAttendeeCount(1)
                      return
                    }
                    const capacityLimit = selectedAmenity?.capacity ?? 1
                    const dynamicLimit = remainingSlots > 0 ? remainingSlots : capacityLimit
                    setAttendeeCount(Math.min(Math.max(parsed, 1), Math.max(dynamicLimit, 1)))
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  One attendee uses one slot. Increase the count to block time for roommates or guests.
                </p>
                {remainingSlots > 0 && attendeeCount > remainingSlots ? (
                  <p className="text-xs text-destructive">Only {remainingSlots} slot(s) remain for this window.</p>
                ) : null}
                {remainingSlots === 0 ? (
                  <p className="text-xs text-destructive">Pick a new time—this window is fully booked.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Upcoming reservations</Label>
                {upcomingReservations.length === 0 ? (
                  <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                    No upcoming bookings for this amenity.
                  </div>
                ) : (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {upcomingReservations.map((booking) => {
                      const start = new Date(booking.start_time)
                      return (
                        <li key={booking.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1">
                          <span>{timeFormatter.format(start)}</span>
                          <span className="font-medium text-foreground">{booking.attendee_count} attendee(s)</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              {usingDemoData ? (
                <p className="text-xs text-muted-foreground">
                  Configure Supabase credentials to enable live reservations.
                </p>
              ) : null}
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Booking…" : "Reserve amenity"}
              </Button>
            </div>
          </form>
        )}
        {statusNode ? <div>{statusNode}</div> : null}
      </CardContent>
    </Card>
  )
}
