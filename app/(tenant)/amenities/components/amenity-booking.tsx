'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'

import type { Database } from '@/lib/supabase'
import { getAmenityAvailability, createAmenityReservation } from '@/app/(tenant)/amenities/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'

const DEFAULT_SLOT_LENGTH_MINUTES = 60
const DEFAULT_OPEN_HOUR = 8
const DEFAULT_CLOSE_HOUR = 22

type Amenity = Database['public']['Tables']['amenities']['Row']
type AmenityReservation = Database['public']['Tables']['amenity_reservations']['Row']

type ReservationWithAmenity = AmenityReservation & {
  amenities: Pick<Amenity, 'name'> | null
}

interface AmenityBookingProps {
  amenities: Amenity[]
  reservations: ReservationWithAmenity[]
}

export function AmenityBooking({ amenities, reservations }: AmenityBookingProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | undefined>(amenities[0]?.id)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (amenities.length === 0) {
      return undefined
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>(undefined)
  const [availability, setAvailability] = useState<{ start: string; end: string }[]>([])
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [isLoadingAvailability, startAvailabilityTransition] = useTransition()
  const [isSubmitting, startReservationTransition] = useTransition()
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const activeAmenity = useMemo(
    () => amenities.find((amenity) => amenity.id === selectedAmenityId),
    [amenities, selectedAmenityId],
  )

  useEffect(() => {
    if (!selectedAmenityId || !selectedDate) {
      return
    }

    setAvailability([])
    setSelectedSlot(undefined)
    setAvailabilityError(null)

    startAvailabilityTransition(async () => {
      try {
        const slots = await getAmenityAvailability({
          amenityId: selectedAmenityId,
          date: selectedDate.toISOString(),
          slotMinutes: DEFAULT_SLOT_LENGTH_MINUTES,
          openHour: DEFAULT_OPEN_HOUR,
          closeHour: DEFAULT_CLOSE_HOUR,
        })
        setAvailability(slots)
      } catch (error) {
        console.error('Failed to load amenity availability', error)
        setAvailabilityError('Unable to load availability for that date. Please try again later.')
      }
    })
  }, [selectedAmenityId, selectedDate])

  const handleSlotSelection = (slot: string) => {
    setSelectedSlot(slot)
  }

  const handleSubmit = async () => {
    if (!selectedAmenityId || !selectedSlot) {
      toast({
        title: 'Select a time slot',
        description: 'Choose a date and time before submitting your reservation.',
        variant: 'destructive',
      })
      return
    }

    const slot = availability.find((value) => value.start === selectedSlot)

    if (!slot) {
      toast({
        title: 'Unknown time slot',
        description: 'Please refresh availability and try again.',
        variant: 'destructive',
      })
      return
    }

    startReservationTransition(async () => {
      const result = await createAmenityReservation({
        amenityId: selectedAmenityId,
        startTime: slot.start,
        endTime: slot.end,
      })

      if (!result.success) {
        toast({
          title: 'Reservation not submitted',
          description: result.error ?? 'Please try again.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Reservation submitted',
        description: result.message,
      })

      setSelectedSlot(undefined)
      router.refresh()
    })
  }

  const upcomingReservations = useMemo(
    () =>
      reservations.filter((reservation) => {
        const end = parseISO(reservation.end_time)
        return end.getTime() > Date.now()
      }),
    [reservations],
  )

  const statusBadgeVariant = (status: ReservationWithAmenity['status']) => {
    switch (status) {
      case 'approved':
        return 'default' as const
      case 'denied':
        return 'destructive' as const
      case 'cancelled':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  const readableStatus = (status: ReservationWithAmenity['status']) =>
    status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="order-2 lg:order-1">
        <CardHeader>
          <CardTitle>Amenity reservations</CardTitle>
          <CardDescription>
            Choose an amenity, pick a date, then reserve an available time slot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Amenity</label>
            <Select
              value={selectedAmenityId}
              onValueChange={(value) => {
                setSelectedAmenityId(value)
                setAvailability([])
                setSelectedDate(today)
              }}
              disabled={amenities.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an amenity" />
              </SelectTrigger>
              <SelectContent>
                {amenities.map((amenity) => (
                  <SelectItem key={amenity.id} value={amenity.id}>
                    {amenity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {amenities.length === 0 ? (
              <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Staff members have not published any bookable amenities yet.
              </p>
            ) : (
              activeAmenity && (
                <div className="rounded-md border bg-muted/30 p-4 text-sm">
                  {activeAmenity.description && (
                    <p className="mb-2 font-medium">{activeAmenity.description}</p>
                  )}
                  {activeAmenity.rules && (
                    <div className="space-y-1 text-muted-foreground">
                      {activeAmenity.rules
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, index) => (
                          <p key={`${line}-${index}`}>&bull; {line}</p>
                        ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Select a date</label>
            {amenities.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Add amenities in the dashboard to enable bookings.
              </div>
            ) : (
              <Calendar
                selected={selectedDate}
                onSelect={(value) => setSelectedDate(value ?? undefined)}
                mode="single"
                disabled={{ before: today }}
                className="rounded-md border"
              />
            )}
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Available time slots</label>
              {selectedDate && (
                <span className="text-xs text-muted-foreground">
                  {format(selectedDate, 'PPP')}
                </span>
              )}
            </div>
            {availabilityError && (
              <p className="text-sm text-destructive">{availabilityError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {isLoadingAvailability ? (
                <p className="text-sm text-muted-foreground">Loading availability…</p>
              ) : availability.length > 0 ? (
                availability.map((slot) => {
                  const label = `${format(parseISO(slot.start), 'p')} – ${format(parseISO(slot.end), 'p')}`
                  return (
                    <Button
                      key={slot.start}
                      type="button"
                      variant={selectedSlot === slot.start ? 'default' : 'outline'}
                      onClick={() => handleSlotSelection(slot.start)}
                    >
                      {label}
                    </Button>
                  )
                })
              ) : selectedDate ? (
                <p className="text-sm text-muted-foreground">No open slots for this date.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Select a date to view availability.</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedSlot || amenities.length === 0}>
            {isSubmitting ? 'Submitting…' : 'Request reservation'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="order-1 lg:order-2">
        <CardHeader>
          <CardTitle>Your upcoming reservations</CardTitle>
          <CardDescription>Track pending and approved reservations at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming reservations yet.</p>
          ) : (
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-4">
                {upcomingReservations.map((reservation) => (
                  <div key={reservation.id} className="rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {reservation.amenities?.name ?? 'Amenity'}
                      </p>
                      <Badge variant={statusBadgeVariant(reservation.status)}>
                        {readableStatus(reservation.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(reservation.start_time), 'PPP p')} – {format(parseISO(reservation.end_time), 'p')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
