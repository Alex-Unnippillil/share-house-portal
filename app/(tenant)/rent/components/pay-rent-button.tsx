'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'

import {
  START_PAYMENT_DEFAULT_STATE,
  type StartRentPaymentState,
  startRentPayment,
} from '../actions'

type PayRentButtonProps = {
  invoiceIds: string[]
  disabled?: boolean
}

export function PayRentButton({ invoiceIds, disabled }: PayRentButtonProps) {
  const [state, formAction] = useFormState<StartRentPaymentState, FormData>(
    startRentPayment,
    START_PAYMENT_DEFAULT_STATE,
  )

  useEffect(() => {
    if (state.status === 'success' && state.url) {
      window.location.href = state.url
    }
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="provider" value="stripe" />
      <input type="hidden" name="invoiceIds" value={JSON.stringify(invoiceIds)} />
      <SubmitButton disabled={disabled} />
      {state.status === 'error' ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full">
      {pending ? 'Starting checkout…' : 'Pay rent'}
    </Button>
  )
}
