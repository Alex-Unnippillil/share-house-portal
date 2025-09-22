'use client'

import { useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AMENITY_OPTIONS } from '@/lib/amenities'
import {
  createBlackoutAction,
  initialBlackoutFormState,
  type BlackoutFormState,
} from './actions'

export function BlackoutForm() {
  const [state, formAction] = useFormState<BlackoutFormState, FormData>(
    createBlackoutAction,
    initialBlackoutFormState
  )
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state.status])

  const amenityError = state.issues?.amenityId?.[0]
  const startError = state.issues?.startsAt?.[0]
  const endError = state.issues?.endsAt?.[0]
  const reasonError = state.issues?.reason?.[0]

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state.message && (
        <div
          role="status"
          className={`rounded border p-3 text-sm ${
            state.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amenityId">Amenity</Label>
        <select
          id="amenityId"
          name="amenityId"
          required
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            amenityError ? 'border-red-500 focus-visible:ring-red-400' : 'border-input'
          }`}
          defaultValue=""
        >
          <option value="" disabled>
            Select an amenity
          </option>
          {AMENITY_OPTIONS.map((amenity) => (
            <option key={amenity.id} value={amenity.id}>
              {amenity.label}
            </option>
          ))}
        </select>
        {amenityError && (
          <p className="text-sm text-red-600" role="alert">
            {amenityError}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Starts</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className={startError ? 'border-red-500 focus-visible:ring-red-400' : undefined}
          />
          {startError && (
            <p className="text-sm text-red-600" role="alert">
              {startError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">Ends</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            className={endError ? 'border-red-500 focus-visible:ring-red-400' : undefined}
          />
          {endError && (
            <p className="text-sm text-red-600" role="alert">
              {endError}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          name="reason"
          required
          rows={3}
          maxLength={280}
          placeholder="Maintenance, deep cleaning, policy change..."
          className={reasonError ? 'border-red-500 focus-visible:ring-red-400' : undefined}
        />
        <p className="text-xs text-muted-foreground">
          This message is shared with tenants when they try to book an amenity during the blackout.
        </p>
        {reasonError && (
          <p className="text-sm text-red-600" role="alert">
            {reasonError}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full md:w-auto">
        Save blackout
      </Button>
    </form>
  )
}
