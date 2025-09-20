'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { AmenityReservationStatus } from '@/utils/typed-supabase-client'
import type { AmenityWithReservations } from './actions'
import {
  createAmenityAction,
  setAmenityStatusAction,
  updateAmenityAction,
  updateReservationStatusAction,
} from './actions'

interface AmenityManagementClientProps {
  amenities: AmenityWithReservations[]
}

type AmenityDraft = {
  name: string
  description: string
  rules: string
  is_active: boolean
}

type Feedback = { type: 'success' | 'error'; message: string } | null

const reservationStatusTransitions: Record<AmenityReservationStatus, string[]> = {
  pending: ['approved', 'denied', 'cancelled'],
  approved: ['cancelled', 'denied'],
  denied: ['pending'],
  cancelled: ['pending'],
}

function buildDrafts(amenities: AmenityWithReservations[]): Record<string, AmenityDraft> {
  return Object.fromEntries(
    amenities.map((amenity) => [
      amenity.id,
      {
        name: amenity.name,
        description: amenity.description ?? '',
        rules: amenity.rules ?? '',
        is_active: amenity.is_active,
      },
    ])
  )
}

export function AmenityManagementClient({ amenities }: AmenityManagementClientProps) {
  const [createForm, setCreateForm] = useState({ name: '', description: '', rules: '' })
  const [drafts, setDrafts] = useState<Record<string, AmenityDraft>>(() => buildDrafts(amenities))
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isSaving, startSavingTransition] = useTransition()
  const [isUpdatingReservation, startReservationTransition] = useTransition()

  useEffect(() => {
    setDrafts(buildDrafts(amenities))
  }, [amenities])

  const activeCount = useMemo(
    () => amenities.filter((amenity) => amenity.is_active).length,
    [amenities]
  )

  const handleCreateAmenity = () => {
    if (!createForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Amenity name is required.' })
      return
    }

    startSavingTransition(async () => {
      try {
        await createAmenityAction({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          rules: createForm.rules.trim() || undefined,
        })
        setCreateForm({ name: '', description: '', rules: '' })
        setFeedback({ type: 'success', message: 'Amenity created successfully.' })
      } catch (error) {
        console.error('Failed to create amenity', error)
        setFeedback({ type: 'error', message: 'Unable to create amenity. Please try again.' })
      }
    })
  }

  const handleDraftChange = (id: string, patch: Partial<AmenityDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleSaveAmenity = (id: string) => {
    const draft = drafts[id]
    if (!draft) return

    if (!draft.name.trim()) {
      setFeedback({ type: 'error', message: 'Amenity name cannot be empty.' })
      return
    }

    startSavingTransition(async () => {
      try {
        await updateAmenityAction({
          id,
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          rules: draft.rules.trim() || undefined,
          is_active: draft.is_active,
        })
        setFeedback({ type: 'success', message: 'Amenity updated.' })
      } catch (error) {
        console.error('Failed to update amenity', error)
        setFeedback({ type: 'error', message: 'Unable to update amenity.' })
      }
    })
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    handleDraftChange(id, { is_active: isActive })
    startSavingTransition(async () => {
      try {
        await setAmenityStatusAction({ id, is_active: isActive })
        setFeedback({ type: 'success', message: 'Amenity status updated.' })
      } catch (error) {
        console.error('Failed to toggle amenity', error)
        setFeedback({ type: 'error', message: 'Unable to change amenity status.' })
      }
    })
  }

  const handleReservationStatus = (id: string, status: AmenityReservationStatus) => {
    startReservationTransition(async () => {
      try {
        await updateReservationStatusAction({ id, status })
        setFeedback({ type: 'success', message: 'Reservation status updated.' })
      } catch (error) {
        console.error('Failed to update reservation status', error)
        setFeedback({ type: 'error', message: 'Unable to update reservation status.' })
      }
    })
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a new amenity</CardTitle>
          <CardDescription>
            Build your amenity catalog by adding shared spaces, equipment, or services that tenants
            can reserve.
          </CardDescription>
        </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="amenity-name">
                Name
              </label>
              <Input
                id="amenity-name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g., Rooftop Lounge"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="amenity-description">
                Description
              </label>
              <Textarea
                id="amenity-description"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Summarize the amenity and what residents can expect."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="amenity-rules">
                Policies & guidelines
              </label>
              <Textarea
                id="amenity-rules"
                value={createForm.rules}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, rules: event.target.value }))
                }
                placeholder="Outline important rules for using the amenity."
              />
            </div>
          </CardContent>
        <CardFooter>
          <Button onClick={handleCreateAmenity} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add amenity'}
          </Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Amenity catalog</h2>
        <p className="text-sm text-muted-foreground">
          {amenities.length} amenity{amenities.length === 1 ? '' : 'ies'} configured · {activeCount}
          {' '}active
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {amenities.length === 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No amenities configured yet. Use the form above to create your first amenity.
            </CardContent>
          </Card>
        )}
        {amenities.map((amenity) => {
          const draft = drafts[amenity.id]
          return (
            <Card key={amenity.id} className="flex flex-col">
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-xl">{amenity.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Switch
                      checked={draft?.is_active ?? amenity.is_active}
                      onCheckedChange={(checked) => handleToggleActive(amenity.id, checked)}
                    />
                  </div>
                </div>
                <CardDescription>
                  Last updated {format(new Date(amenity.updated_at), 'PPP p')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`name-${amenity.id}`}>
                    Name
                  </label>
                  <Input
                    id={`name-${amenity.id}`}
                    value={draft?.name ?? ''}
                    onChange={(event) => handleDraftChange(amenity.id, { name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`description-${amenity.id}`}>
                    Description
                  </label>
                  <Textarea
                    id={`description-${amenity.id}`}
                    value={draft?.description ?? ''}
                    onChange={(event) =>
                      handleDraftChange(amenity.id, { description: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`rules-${amenity.id}`}>
                    Policies
                  </label>
                  <Textarea
                    id={`rules-${amenity.id}`}
                    value={draft?.rules ?? ''}
                    onChange={(event) => handleDraftChange(amenity.id, { rules: event.target.value })}
                  />
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-2 font-medium">Reservations</p>
                  {amenity.reservations.length === 0 ? (
                    <p className="text-muted-foreground">No reservations yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {amenity.reservations
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
                        )
                        .map((reservation) => (
                          <div
                            key={reservation.id}
                            className="rounded-md border bg-muted/40 p-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {format(new Date(reservation.start_at), 'PPP p')} –{' '}
                                  {format(new Date(reservation.end_at), 'p')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Status updates sync with tenant view instantly.
                                </p>
                                {reservation.notes && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Notes: {reservation.notes}
                                  </p>
                                )}
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
                            <div className="mt-2 flex flex-wrap gap-2">
                              {reservationStatusTransitions[reservation.status].map((status) => (
                                <Button
                                  key={status}
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdatingReservation}
                                  onClick={() =>
                                    handleReservationStatus(reservation.id, status as AmenityReservationStatus)
                                  }
                                >
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDrafts((prev) => ({ ...prev, [amenity.id]: buildDrafts([amenity])[amenity.id] }))}
                  disabled={isSaving}
                >
                  Reset changes
                </Button>
                <Button onClick={() => handleSaveAmenity(amenity.id)} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save details'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {feedback && (
        <Card
          className={cn(
            feedback.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
          )}
        >
          <CardContent className="py-4 text-sm">{feedback.message}</CardContent>
        </Card>
      )}
    </div>
  )
}
