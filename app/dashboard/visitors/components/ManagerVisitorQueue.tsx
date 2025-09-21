'use client'

import { useMemo, useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import type { VisitorAuditEntryView, VisitorLogSummary } from '@/types/visitors'

import { resolveVisitorRequest } from '../actions/resolve-visitor-request'
import { VisitorAuditTrail } from './VisitorAuditTrail'

function formatDate(value: string) {
  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch {
    return value
  }
}

interface ManagerVisitorQueueProps {
  logs: VisitorLogSummary[]
  auditLogMap: Record<number, VisitorAuditEntryView[]>
}

type DecisionState = {
  logId: number
  decision: 'approved' | 'denied'
}

export function ManagerVisitorQueue({ logs, auditLogMap }: ManagerVisitorQueueProps) {
  const [dialogState, setDialogState] = useState<DecisionState | null>(null)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const activeLog = useMemo(
    () => (dialogState ? logs.find(log => log.id === dialogState.logId) ?? null : null),
    [dialogState, logs],
  )

  const openDialog = (logId: number, decision: 'approved' | 'denied') => {
    setDialogState({ logId, decision })
    setNotes('')
  }

  const onDecision = () => {
    if (!dialogState) return

    startTransition(async () => {
      const result = await resolveVisitorRequest({
        logId: dialogState.logId,
        decision: dialogState.decision,
        notes: notes.trim() ? notes.trim() : undefined,
      })

      toast({
        title:
          result.status === 'success'
            ? `Request ${dialogState.decision}`
            : 'Unable to update visitor request',
        description: result.message,
        variant: result.status === 'success' ? 'default' : 'destructive',
      })

      if (result.status === 'success') {
        setDialogState(null)
      }
    })
  }

  if (!logs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending visitor approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All caught up! There are no visitor requests waiting for review.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {logs.map(log => {
        const auditEntries = auditLogMap[log.id] ?? []
        return (
          <Card key={log.id}>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">{log.visitorName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(log.arrivalDate)} – {formatDate(log.departureDate)} · {log.totalNights}{' '}
                  night{log.totalNights > 1 ? 's' : ''}
                </p>
              </div>
              <Badge className="w-fit uppercase" variant="secondary">
                {log.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Host:</span> {log.hostName ?? 'Unknown host'}
              </p>
              {log.hostEmail ? (
                <p>
                  <span className="font-medium text-foreground">Contact:</span>{' '}
                  <a className="underline" href={`mailto:${log.hostEmail}`}>
                    {log.hostEmail}
                  </a>
                </p>
              ) : null}
              {log.reason ? (
                <p>
                  <span className="font-medium text-foreground">Reason:</span> {log.reason}
                </p>
              ) : null}
              {log.rule ? (
                <p>
                  <span className="font-medium text-foreground">Policy:</span> {log.rule.title}
                </p>
              ) : null}
              <div>
                <p className="font-medium text-foreground">Recent activity</p>
                <VisitorAuditTrail entries={auditEntries} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Review the request and notify residents if you deny the visit.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => openDialog(log.id, 'denied')}
                  disabled={isPending}
                >
                  Deny
                </Button>
                <Button onClick={() => openDialog(log.id, 'approved')} disabled={isPending}>
                  Approve
                </Button>
                <AlertDialog
                  open={Boolean(dialogState && dialogState.logId === log.id)}
                  onOpenChange={open => {
                    if (!open) {
                      setDialogState(null)
                    }
                  }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {dialogState?.decision === 'approved' ? 'Approve visitor stay?' : 'Deny visitor stay?'}
                      </AlertDialogTitle>
                    </AlertDialogHeader>
                    <p className="text-sm text-muted-foreground">
                      {dialogState?.decision === 'approved'
                        ? 'Approving will notify the residents that this stay is confirmed.'
                        : 'Share a short note so residents understand why the request was denied.'}
                    </p>
                    <Textarea
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Add notes for the residents"
                      rows={3}
                      disabled={isPending}
                      className="mt-4"
                    />
                    <AlertDialogFooter className="pt-4">
                      <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDecision} disabled={isPending}>
                        {isPending ? 'Saving…' : dialogState?.decision === 'approved' ? 'Approve' : 'Deny'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
