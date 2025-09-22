'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { getAmenityLabel } from '@/lib/amenities'
import type { AmenityBlackout } from '@/lib/amenities/blackouts'
import { deleteBlackoutAction } from './actions'

export type AmenityBlackoutSummary = Pick<
  AmenityBlackout,
  'id' | 'amenity_id' | 'starts_at' | 'ends_at' | 'reason'
>

export function BlackoutList({ blackouts }: { blackouts: AmenityBlackoutSummary[] }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!blackouts.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No blackout windows scheduled yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}
      <ul className="space-y-4">
        {blackouts.map((blackout) => {
          const startsAt = new Date(blackout.starts_at)
          const endsAt = new Date(blackout.ends_at)

          return (
            <li
              key={blackout.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {getAmenityLabel(blackout.amenity_id)}
                  </p>
                  <p className="text-base font-medium">
                    {format(startsAt, 'MMM d, yyyy h:mm a')} → {format(endsAt, 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-sm text-muted-foreground">{blackout.reason}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending && pendingId === blackout.id}
                  onClick={() => {
                    setErrorMessage(null)
                    setPendingId(blackout.id)
                    startTransition(async () => {
                      try {
                        const result = await deleteBlackoutAction(blackout.id)
                        if (result?.error) {
                          setErrorMessage(result.error)
                        }
                      } catch (error) {
                        setErrorMessage('Failed to remove the blackout. Please try again.')
                      } finally {
                        setPendingId(null)
                      }
                    })
                  }}
                >
                  {isPending && pendingId === blackout.id ? 'Removing…' : 'Remove'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
