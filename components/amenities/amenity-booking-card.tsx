'use client'

import { useMemo, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  type ActionResponse,
  initialActionState,
  reserveAmenityAction,
  syncCalBookingAction,
} from '@/app/schedule/actions'
import { type CalAvailabilitySlot } from '@/lib/calcom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AmenityCalWidget } from './amenity-cal-widget'

type Amenity = {
  id: string
  slug: string
  name: string
  description?: string | null
  approvalRequired: boolean
  calEventType: string
}

type AmenityBookingCardProps = {
  amenity: Amenity
  availability: CalAvailabilitySlot[]
  calLink: string
  availabilityError?: string | null
}

type BookingDetail = {
  booking?: {
    id?: string | number
    uid?: string
    startTime?: string
    endTime?: string
    start_time?: string
    end_time?: string
    start?: string
    end?: string
    status?: string
    url?: string
    bookingUrl?: string
  }
  data?: unknown
}

function formatSlotLabel(slot: CalAvailabilitySlot) {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const sameDay = start.toDateString() === end.toDateString()

  if (sameDay) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`
  }

  return `${dateFormatter.format(start)} ${timeFormatter.format(start)} → ${dateFormatter.format(end)} ${timeFormatter.format(end)}`
}

function SubmitButton({ label, disabled = false }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full sm:w-auto">
      {pending ? 'Reserving…' : label}
    </Button>
  )
}

function ActionBanner({ state }: { state: ActionResponse }) {
  if (state.status === 'success' && state.message) {
    return <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">{state.message}</p>
  }

  if (state.status === 'error' && state.error) {
    return <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
  }

  return null
}

export function AmenityBookingCard({ amenity, availability, calLink, availabilityError }: AmenityBookingCardProps) {
  const [state, formAction] = useFormState(reserveAmenityAction, initialActionState)
  const [showCalWidget, setShowCalWidget] = useState(false)
  const [syncState, setSyncState] = useState<ActionResponse | null>(null)
  const [syncPending, startSync] = useTransition()

  const slotOptions = useMemo(() => availability.slice(0, 6), [availability])

  async function handleBookingComplete(payload: unknown) {
    const eventData = (payload as BookingDetail) ?? {}
    const booking = (eventData.booking as BookingDetail['booking']) ?? (eventData as BookingDetail['booking'])

    const bookingId = booking?.id ?? booking?.uid
    const startTime = booking?.startTime ?? booking?.start_time ?? booking?.start
    const endTime = booking?.endTime ?? booking?.end_time ?? booking?.end

    if (!bookingId || !startTime || !endTime) {
      setSyncState({ status: 'error', error: 'Unable to parse Cal.com booking details for syncing.' })
      return
    }

    startSync(async () => {
      const result = await syncCalBookingAction({
        amenitySlug: amenity.slug,
        calBookingId: String(bookingId),
        startTime,
        endTime,
        bookingUrl: booking?.url ?? booking?.bookingUrl,
        status: booking?.status === 'CANCELLED' ? 'cancelled' : booking?.status === 'CONFIRMED' ? 'confirmed' : undefined,
        rawPayload: payload,
      })
      setSyncState(result)
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{amenity.name}</CardTitle>
        <CardDescription>
          {amenity.description ?? 'Reserve a timeslot using Cal.com.'}
          {amenity.approvalRequired ? ' This amenity requires manual approval after booking.' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActionBanner state={state} />
        {syncState ? <ActionBanner state={syncState} /> : null}
        {availabilityError ? (
          <p className="text-sm text-destructive">{availabilityError}</p>
        ) : null}
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="amenitySlug" value={amenity.slug} />
          <div className="space-y-1">
            <Label htmlFor={`${amenity.slug}-slot`}>Next available slots</Label>
            {slotOptions.length > 0 ? (
              <select
                id={`${amenity.slug}-slot`}
                name="slot"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                defaultValue={slotOptions[0] ? `${slotOptions[0].start}|${slotOptions[0].end}` : ''}
                disabled={slotOptions.length === 0}
              >
                {slotOptions.map((slot) => (
                  <option key={`${slot.start}-${slot.end}`} value={`${slot.start}|${slot.end}`}>
                    {formatSlotLabel(slot)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cal.com did not return any upcoming availability. Try the booking widget below for more options.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${amenity.slug}-note`}>Notes for roommates (optional)</Label>
            <Textarea id={`${amenity.slug}-note`} name="note" placeholder="Add context or special requirements" rows={3} />
          </div>
          <SubmitButton label="Reserve selected slot" disabled={slotOptions.length === 0} />
          {state.bookingUrl ? (
            <a
              href={state.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-sm font-medium text-primary underline"
            >
              View booking on Cal.com
            </a>
          ) : null}
        </form>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Need more options?</p>
            <Button variant="ghost" type="button" onClick={() => setShowCalWidget((value) => !value)}>
              {showCalWidget ? 'Hide calendar' : 'Open full Cal.com widget'}
            </Button>
          </div>
          {showCalWidget ? (
            <div className="rounded-md border border-dashed border-border p-4">
              {syncPending ? (
                <p className="text-sm text-muted-foreground">Syncing booking…</p>
              ) : null}
              <AmenityCalWidget calLink={calLink} onBookingComplete={handleBookingComplete} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
