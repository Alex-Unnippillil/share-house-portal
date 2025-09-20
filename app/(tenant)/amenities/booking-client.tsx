'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { format, formatISO, parseISO, startOfDay } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import type { Amenity } from '@/utils/typed-supabase-client'
import {
  SLOT_LENGTH_MINUTES,
  createAmenityReservation,
  getAmenityAvailability,
} from './actions'
import type { AvailabilityResult, AvailabilitySlot } from './actions'

interface AmenityBookingClientProps {
  amenities: Amenity[]
  viewerEmail: string | null
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

export function AmenityBookingClient({ amenities, viewerEmail }: AmenityBookingClientProps) {
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(
    amenities[0]?.id ?? null
  )
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availability, setAvailability] = useState<AvailabilityResult>({
    slots: [],
    reservations: [],
  })
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isLoading, startTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()

  const selectedAmenity = useMemo(
    () => amenities.find((amenity) => amenity.id === selectedAmenityId) ?? null,
    [amenities, selectedAmenityId]
  )

  useEffect(() => {
    if (!selectedAmenityId) {
      setAvailability({ slots: [], reservations: [] })
      return
    }

    setFeedback(null)
    startTransition(async () => {
      try {
        const nextAvailability = await getAmenityAvailability({
          amenityId: selectedAmenityId,
          date: formatISO(selectedDate, { representation: 'date' }),
        })
        setAvailability(nextAvailability)
        setSelectedSlot(null)
      } catch (error) {
        console.error('Failed to load amenity availability', error)
        setAvailability({ slots: [], reservations: [] })
        setFeedback({ type: 'error', message: 'Unable to load availability for that amenity.' })
      }
    })
  }, [selectedAmenityId, selectedDate])

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot)
    setFeedback(null)
  }

  const handleCreateReservation = () => {
    setFeedback(null)
    if (!selectedAmenityId || !selectedSlot) {
      setFeedback({ type: 'error', message: 'Please select an amenity, date, and time slot.' })
      return
    }

    const start = parseISO(selectedSlot.start)
    const end = parseISO(selectedSlot.end)

    startSubmitTransition(async () => {
      try {
        const result = await createAmenityReservation({
          amenityId: selectedAmenityId,
          start,
          end,
          notes,
        })

        if (!result.success) {
          setFeedback({ type: 'error', message: result.error ?? 'Reservation failed.' })
          return
        }

        setFeedback({
          type: 'success',
          message: 'Your reservation request has been submitted for review.',
        })
        setNotes('')
        setSelectedSlot(null)

        const refreshedAvailability = await getAmenityAvailability({
          amenityId: selectedAmenityId,
          date: formatISO(selectedDate, { representation: 'date' }),
        })
        setAvailability(refreshedAvailability)
      } catch (error) {
        console.error('Failed to create amenity reservation', error)
        setFeedback({ type: 'error', message: 'Unable to save reservation. Please try again.' })
      }
    })
  }

  const reservationSummaries = availability.reservations
    .slice()
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select an amenity</CardTitle>
            <CardDescription>
              Choose from the available shared spaces in your community.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {amenities.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No amenities are currently available. Check back later.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {amenities.map((amenity) => (
                <Button
                  key={amenity.id}
                  variant={selectedAmenityId === amenity.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setSelectedAmenityId(amenity.id)}
                >
                  <span className="font-medium">{amenity.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {selectedAmenity && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedAmenity.name}</CardTitle>
              <CardDescription>Review amenity details before booking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedAmenity.description && (
                <div>
                  <p className="mb-1 font-medium">Description</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                    {selectedAmenity.description}
                  </p>
                </div>
              )}
              {selectedAmenity.rules && (
                <div>
                  <p className="mb-1 font-medium">Policies</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                    {selectedAmenity.rules}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Choose a date</CardTitle>
            <CardDescription>Select a day to check available times.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 lg:flex-row">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) =>
                !selectedAmenity || (date ? date < startOfDay(new Date()) : true)
              }
              className="rounded-md border"
            />
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium">Available time slots</p>
                <p className="text-xs text-muted-foreground">
                  Each reservation is {SLOT_LENGTH_MINUTES} minutes. Pending and approved
                  reservations block additional bookings.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availability.slots.length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No open time slots for this day.
                  </p>
                )}
                {availability.slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start
                  const slotLabel = format(parseISO(slot.start), 'p')
                  return (
                    <Button
                      key={slot.start}
                      variant={isSelected ? 'default' : 'outline'}
                      disabled={isLoading || isSubmitting}
                      onClick={() => handleSlotSelect(slot)}
                      className={cn('justify-center', isSelected && 'ring-2 ring-primary')}
                    >
                      {slotLabel}
                    </Button>
                  )
                })}
              </div>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add optional context for building staff (max 500 characters)."
                maxLength={500}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {viewerEmail ? `Signed in as ${viewerEmail}` : 'Signed in tenant'}
            </div>
            <Button onClick={handleCreateReservation} disabled={isSubmitting || !selectedSlot}>
              {isSubmitting ? 'Submitting...' : 'Request reservation'}
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Same-day reservations</CardTitle>
            <CardDescription>
              Pending and approved reservations appear below for quick reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reservationSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reservations for this date yet. Be the first to book a slot!
              </p>
            ) : (
              <div className="space-y-3">
                {reservationSummaries.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {format(parseISO(reservation.start_at), 'p')} –{' '}
                        {format(parseISO(reservation.end_at), 'p')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        reservation.status === 'approved'
                          ? 'default'
                          : reservation.status === 'pending'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {feedback && (
          <Card
            className={cn(
              feedback.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            )}
          >
            <CardContent className="py-4 text-sm">
              {feedback.message}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
