'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

import { cancelVisitorRequest, initialVisitorActionState } from '../actions'

interface CancelVisitorDialogProps {
  logId: string
  guestName: string
  disabled?: boolean
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Cancelling…' : 'Cancel visit'}
    </Button>
  )
}

export default function CancelVisitorDialog({ logId, guestName, disabled }: CancelVisitorDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useFormState(cancelVisitorRequest, initialVisitorActionState)
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Visit cancelled', description: `${guestName} has been notified.` })
      setOpen(false)
      formRef.current?.reset()
    }
    if (state.status === 'error' && state.message) {
      toast({ title: 'Unable to cancel', description: state.message, variant: 'destructive' })
    }
  }, [state, guestName, toast])

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) formRef.current?.reset() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive" disabled={disabled}>
          Cancel visit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {guestName}&apos;s stay?</DialogTitle>
          <DialogDescription>
            We&apos;ll notify your roommates and property manager that this visit has been cancelled.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="logId" value={logId} />
          <div className="space-y-2">
            <Label htmlFor={`cancel-reason-${logId}`}>Share a quick reason</Label>
            <Textarea
              id={`cancel-reason-${logId}`}
              name="reason"
              rows={3}
              placeholder="Plans changed — they found a hotel instead."
              required
            />
            {state.fieldErrors?.reason && <p className="text-sm text-destructive">{state.fieldErrors.reason}</p>}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep visit
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
