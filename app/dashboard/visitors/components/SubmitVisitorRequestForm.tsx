'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { initialVisitorActionState, submitVisitorRequest } from '../actions'
import { type VisitorRuleRecord } from '@/lib/visitors/repository'

interface SubmitVisitorRequestFormProps {
  rule: VisitorRuleRecord | null
  hostName: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Submitting…' : 'Submit request'}
    </Button>
  )
}

export default function SubmitVisitorRequestForm({ rule, hostName }: SubmitVisitorRequestFormProps) {
  const [state, formAction] = useFormState(submitVisitorRequest, initialVisitorActionState)
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: 'Guest stay requested',
        description: 'We’ve notified your roommates and property manager.',
      })
      formRef.current?.reset()
    }
    if (state.status === 'error' && state.message) {
      toast({ title: 'Unable to submit', description: state.message, variant: 'destructive' })
    }
  }, [state, toast])

  const hasFieldError = (name: string) => Boolean(state.fieldErrors?.[name])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Request a stay</h2>
        <p className="text-sm text-muted-foreground">
          Submit details about your overnight visitor so everyone in {hostName}&apos;s household stays informed.
        </p>
      </div>

      {!rule && (
        <Alert variant="destructive">
          <AlertTitle>Policy pending</AlertTitle>
          <AlertDescription>
            Your property manager hasn&apos;t set a formal overnight policy yet. We&apos;ll forward your request for manual review.
          </AlertDescription>
        </Alert>
      )}

      <form ref={formRef} action={formAction} className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="guestFullName">Guest full name</Label>
          <Input id="guestFullName" name="guestFullName" placeholder="Alex Johnson" aria-invalid={hasFieldError('guestFullName')} />
          {state.fieldErrors?.guestFullName && (
            <p className="text-sm text-destructive">{state.fieldErrors.guestFullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guestEmail">Guest email (optional)</Label>
          <Input
            id="guestEmail"
            name="guestEmail"
            type="email"
            placeholder="alex@example.com"
            aria-invalid={hasFieldError('guestEmail')}
          />
          {state.fieldErrors?.guestEmail && <p className="text-sm text-destructive">{state.fieldErrors.guestEmail}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedGuests">Number of guests</Label>
          <Input
            id="expectedGuests"
            name="expectedGuests"
            type="number"
            min={1}
            defaultValue={1}
            aria-invalid={hasFieldError('expectedGuests')}
          />
          {state.fieldErrors?.expectedGuests && (
            <p className="text-sm text-destructive">{state.fieldErrors.expectedGuests}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="arrivalDate">Arrival date</Label>
          <Input id="arrivalDate" name="arrivalDate" type="date" aria-invalid={hasFieldError('arrivalDate')} />
          {state.fieldErrors?.arrivalDate && <p className="text-sm text-destructive">{state.fieldErrors.arrivalDate}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="departureDate">Departure date</Label>
          <Input id="departureDate" name="departureDate" type="date" aria-invalid={hasFieldError('departureDate')} />
          {state.fieldErrors?.departureDate && (
            <p className="text-sm text-destructive">{state.fieldErrors.departureDate}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reason">Reason for visit</Label>
          <Textarea id="reason" name="reason" rows={3} aria-invalid={hasFieldError('reason')} placeholder="Family in town for the weekend." />
          {state.fieldErrors?.reason && <p className="text-sm text-destructive">{state.fieldErrors.reason}</p>}
        </div>

        {state.status === 'error' && !state.fieldErrors && state.message && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive md:col-span-2">
            {state.message}
          </div>
        )}

        <div className="flex justify-end md:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </section>
  )
}
