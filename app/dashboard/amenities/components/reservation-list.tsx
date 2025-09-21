'use client'

import { useMemo } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { format, parseISO } from 'date-fns'

import { updateReservationStatusAction } from '@/app/dashboard/amenities/actions'
import type { Database } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

type Reservation = Database['public']['Tables']['amenity_reservations']['Row']

type ReservationWithRelations = Reservation & {
  amenities: { name: string } | null
  lease: { full_name: string | null; email: string | null } | null
}

const initialState = { success: false, message: '', error: '' }

const statusOptions: Reservation['status'][] = ['pending', 'approved', 'denied', 'cancelled']

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Updating…' : 'Update'}
    </Button>
  )
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
  switch (status) {
    case 'approved':
      return <Badge>Approved</Badge>
    case 'denied':
      return <Badge variant="destructive">Denied</Badge>
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>
    default:
      return <Badge variant="secondary">Pending</Badge>
  }
}

function ReservationItem({ reservation }: { reservation: ReservationWithRelations }) {
  const [state, formAction] = useFormState(updateReservationStatusAction, initialState)

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{reservation.amenities?.name ?? 'Amenity'}</p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(reservation.start_time), 'PPP p')} – {format(parseISO(reservation.end_time), 'p')}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <div className="grid gap-1 text-sm text-muted-foreground">
        <span>
          Tenant: {reservation.lease?.full_name ?? 'Unknown'}
          {reservation.lease?.email ? ` • ${reservation.lease.email}` : ''}
        </span>
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="reservation_id" value={reservation.id} />
        <label htmlFor={`status-${reservation.id}`} className="text-sm font-medium">
          Status
        </label>
        <select
          id={`status-${reservation.id}`}
          name="status"
          defaultValue={reservation.status}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <SubmitButton />
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.success && state.message && <p className="text-sm text-green-600">{state.message}</p>}
      </form>
    </div>
  )
}

interface ReservationListProps {
  reservations: ReservationWithRelations[]
}

export function ReservationList({ reservations }: ReservationListProps) {
  const pendingReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === 'pending'),
    [reservations],
  )

  const otherReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status !== 'pending'),
    [reservations],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Pending approvals</CardTitle>
          <CardDescription>Approve or deny new requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {pendingReservations.map((reservation) => (
                <ReservationItem key={reservation.id} reservation={reservation} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>All reservations</CardTitle>
          <CardDescription>Review the latest activity across amenities.</CardDescription>
        </CardHeader>
        <CardContent>
          {otherReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No historical reservations yet.</p>
          ) : (
            <ScrollArea className="h-[28rem] pr-4">
              <div className="space-y-4">
                {otherReservations.map((reservation) => (
                  <ReservationItem key={reservation.id} reservation={reservation} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
