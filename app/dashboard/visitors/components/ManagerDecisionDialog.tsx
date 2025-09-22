'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

import { approveVisitorRequest, denyVisitorRequest, initialVisitorActionState } from '../actions'

interface ManagerDecisionDialogProps {
  logId: string
  guestName: string
  action: 'approve' | 'deny'
}

const actionConfig = {
  approve: {
    label: 'Approve visit',
    trigger: 'Approve',
    description: 'Let the host know this visitor is approved. Optionally share a note with the household.',
    variant: 'default' as const,
    action: approveVisitorRequest,
    toastTitle: 'Visit approved',
  },
  deny: {
    label: 'Deny visit',
    trigger: 'Deny',
    description: 'Reject this request and notify the host and roommates.',
    variant: 'destructive' as const,
    action: denyVisitorRequest,
    toastTitle: 'Visit denied',
  },
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Submitting…' : children}
    </Button>
  )
}

export default function ManagerDecisionDialog({ logId, guestName, action }: ManagerDecisionDialogProps) {
  const config = actionConfig[action]
  const [open, setOpen] = useState(false)
  const [state, formAction] = useFormState(config.action, initialVisitorActionState)
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: config.toastTitle, description: `${guestName} has been updated.` })
      setOpen(false)
      formRef.current?.reset()
    }
    if (state.status === 'error' && state.message) {
      toast({ title: 'Unable to update request', description: state.message, variant: 'destructive' })
    }
  }, [state, config.toastTitle, guestName, toast])

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) formRef.current?.reset() }}>
      <DialogTrigger asChild>
        <Button variant={config.variant}>
          {config.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {config.label} – {guestName}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="logId" value={logId} />
          <div className="space-y-2">
            <Label htmlFor={`manager-note-${logId}`}>Optional note</Label>
            <Textarea id={`manager-note-${logId}`} name="note" rows={3} placeholder="Thanks for submitting with plenty of notice!" />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <SubmitButton>{config.label}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
