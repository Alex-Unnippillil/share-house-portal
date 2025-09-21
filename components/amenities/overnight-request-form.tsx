'use client'

import { useMemo } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  type ActionResponse,
  initialActionState,
  requestOvernightVisitAction,
} from '@/app/schedule/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type OvernightVisitSummary = {
  id: string
  guest_name: string
  guest_email: string | null
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'denied'
  notes: string | null
  approval_notes: string | null
  created_at: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Submitting…' : 'Request overnight stay'}
    </Button>
  )
}

function StatusBadge({ status }: { status: OvernightVisitSummary['status'] }) {
  switch (status) {
    case 'approved':
      return <Badge variant="complete">Approved</Badge>
    case 'denied':
      return <Badge variant="destructive">Denied</Badge>
    default:
      return <Badge variant="secondary">Pending review</Badge>
  }
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

export function OvernightRequestForm({ requests }: { requests: OvernightVisitSummary[] }) {
  const [state, formAction] = useFormState(requestOvernightVisitAction, initialActionState)

  const upcomingRequests = useMemo(
    () =>
      [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [requests]
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Overnight guests</CardTitle>
        <CardDescription>
          Submit a request for overnight visitors. House moderators will approve or decline and you will receive an email update.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActionBanner state={state} />
        <form action={formAction} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="guestName">Guest name</Label>
            <Input id="guestName" name="guestName" placeholder="Guest full name" required />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="guestEmail">Guest email (optional)</Label>
            <Input id="guestEmail" name="guestEmail" type="email" placeholder="guest@example.com" />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="startDate">Arrival</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="endDate">Departure</Label>
            <Input id="endDate" name="endDate" type="date" required />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="notes">Notes for moderators</Label>
            <Textarea id="notes" name="notes" placeholder="Reason for the stay, number of nights, etc." rows={3} />
          </div>
          <div className="md:col-span-2">
            <SubmitButton />
          </div>
        </form>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Previous requests</h3>
          {upcomingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overnight guest requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingRequests.map((request) => (
                <li key={request.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {request.guest_name}
                        <span className="ml-2 text-sm text-muted-foreground">
                          {new Date(request.start_date).toLocaleDateString()} – {new Date(request.end_date).toLocaleDateString()}
                        </span>
                      </p>
                      {request.notes ? (
                        <p className="text-sm text-muted-foreground">{request.notes}</p>
                      ) : null}
                      {request.approval_notes ? (
                        <p className="text-sm text-primary">Moderator notes: {request.approval_notes}</p>
                      ) : null}
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
