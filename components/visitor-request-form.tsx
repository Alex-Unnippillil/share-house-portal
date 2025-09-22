'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { submitVisitorRequest, type VisitorRequestActionState } from '@/app/(tenant)/visitors/new/actions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const initialState: VisitorRequestActionState = {
  success: false,
  message: null,
  errors: {},
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Submitting…' : 'Submit request'}
    </Button>
  )
}

export function VisitorRequestForm() {
  const [state, formAction] = useFormState(submitVisitorRequest, initialState)
  const [startDate, setStartDate] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      setStartDate('')
      formRef.current?.reset()
    }
  }, [state.success])

  const generalErrors = state.errors?.general ?? []

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state.message ? (
        <div
          role="status"
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            state.success
              ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100'
              : 'border-destructive/60 bg-destructive/10 text-destructive'
          )}
        >
          {state.message}
        </div>
      ) : null}

      {generalErrors.length > 0 ? (
        <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
          {generalErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="guestName">Guest name</Label>
        <Input
          id="guestName"
          name="guestName"
          placeholder="Who is staying over?"
          required
          aria-invalid={state.errors?.guestName ? 'true' : 'false'}
        />
        {state.errors?.guestName?.map((error, index) => (
          <p key={index} className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Arrival date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={state.errors?.startDate ? 'true' : 'false'}
          />
          {state.errors?.startDate?.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Departure date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            min={startDate || undefined}
            aria-invalid={state.errors?.endDate ? 'true' : 'false'}
          />
          {state.errors?.endDate?.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for visit</Label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Let your roommates know the context and any house needs."
          required
          rows={4}
          aria-invalid={state.errors?.reason ? 'true' : 'false'}
        />
        {state.errors?.reason?.map((error, index) => (
          <p key={index} className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </div>

      <SubmitButton />
    </form>
  )
}
