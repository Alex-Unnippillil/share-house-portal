'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  getInitialScanState,
  type ScanMissedChoresState,
  scanForMissedChoresAction,
} from './actions'

export function ScanMissedChoresForm() {
  const [state, formAction] = useFormState<ScanMissedChoresState, FormData>(
    scanForMissedChoresAction,
    getInitialScanState()
  )

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <SubmitButton />
      </div>
      {state.message ? (
        <p
          className={cn(
            'text-sm sm:ml-2 sm:border-l sm:border-border sm:pl-3',
            state.success === false && 'text-destructive',
            state.success && 'text-emerald-600'
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? 'Scanning…' : 'Scan for missed chores'}
    </Button>
  )
}
