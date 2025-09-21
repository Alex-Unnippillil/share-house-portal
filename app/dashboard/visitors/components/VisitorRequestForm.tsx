'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import type { VisitorRuleSummary } from '@/types/visitors'
import { submitVisitorRequest } from '../actions/submit-visitor-request'
import { visitorActionInitialState, type VisitorActionState } from '../actions/shared'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
      {pending ? 'Submitting…' : 'Submit request'}
    </Button>
  )
}

type SubmitAction = (
  prevState: VisitorActionState,
  formData?: FormData,
) => Promise<VisitorActionState>

interface VisitorRequestFormProps {
  activeRule: VisitorRuleSummary | null
  submitAction?: SubmitAction
}

export function VisitorRequestForm({ activeRule, submitAction }: VisitorRequestFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState<VisitorActionState, FormData>(
    submitAction ?? submitVisitorRequest,
    visitorActionInitialState,
  )

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state.status])

  const disabled = !activeRule

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request an overnight visitor</CardTitle>
      </CardHeader>
      <form ref={formRef} action={formAction} className="space-y-4">
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="visitorName">Visitor name</Label>
            <Input id="visitorName" name="visitorName" placeholder="Guest full name" disabled={disabled} />
            <FieldError message={state.issues?.visitorName?.[0]} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="visitorEmail">Visitor email (optional)</Label>
            <Input
              id="visitorEmail"
              name="visitorEmail"
              type="email"
              placeholder="guest@example.com"
              disabled={disabled}
            />
            <FieldError message={state.issues?.visitorEmail?.[0]} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="arrivalDate">Arrival date</Label>
              <Input id="arrivalDate" name="arrivalDate" type="date" disabled={disabled} />
              <FieldError message={state.issues?.arrivalDate?.[0]} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="departureDate">Departure date</Label>
              <Input id="departureDate" name="departureDate" type="date" disabled={disabled} />
              <FieldError message={state.issues?.departureDate?.[0]} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for stay</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Share any context or house rules for your roommates and manager."
              rows={4}
              disabled={disabled}
            />
            <FieldError message={state.issues?.reason?.[0]} />
          </div>
          {activeRule ? <input type="hidden" name="ruleId" value={activeRule.id} /> : null}
          {state.status !== 'idle' ? (
            <p
              className={`text-sm ${state.status === 'success' ? 'text-emerald-600' : 'text-destructive'}`}
            >
              {state.message}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton disabled={disabled} />
        </CardFooter>
      </form>
    </Card>
  )
}
