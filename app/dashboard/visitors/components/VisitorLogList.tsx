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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import type { VisitorLogSummary } from '@/types/visitors'

import { cancelVisitorRequest } from '../actions/cancel-visitor-request'

function formatDate(value: string) {
  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch {
    return value
  }
}

function statusVariant(status: string) {
  switch (status) {
    case 'approved':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'denied':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    default:
      return 'secondary'
  }
}

function canCancel(log: VisitorLogSummary, currentProfileId: string) {
  if (log.hostId !== currentProfileId) return false
  return log.status === 'pending' || log.status === 'approved'
}

interface VisitorLogListProps {
  logs: VisitorLogSummary[]
  currentProfileId: string
}

export function VisitorLogList({ logs, currentProfileId }: VisitorLogListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [activeLogId, setActiveLogId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeLog = useMemo(
    () => logs.find(log => log.id === activeLogId) ?? null,
    [logs, activeLogId],
  )

  const handleOpen = (logId: number) => {
    setActiveLogId(logId)
    setCancelReason('')
    setDialogOpen(true)
  }

  const handleCancel = () => {
    if (!activeLog) return
    startTransition(async () => {
      const result = await cancelVisitorRequest({
        logId: activeLog.id,
        reason: cancelReason.trim() ? cancelReason.trim() : undefined,
      })

      toast({
        title: result.status === 'success' ? 'Visit cancelled' : 'Unable to cancel visit',
        description: result.message,
        variant: result.status === 'success' ? 'default' : 'destructive',
      })

      if (result.status === 'success') {
        setDialogOpen(false)
      }
    })
  }

  if (!logs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitor history</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No visitor requests yet. Submit your first request to keep roommates and property managers in sync.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {logs.map(log => {
        const showCancel = canCancel(log, currentProfileId)
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
              <Badge variant={statusVariant(log.status)} className="w-fit uppercase">
                {log.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {log.reason ? (
                <p>
                  <span className="font-medium text-foreground">Reason:</span> {log.reason}
                </p>
              ) : null}
              {log.hostName ? (
                <p>
                  <span className="font-medium text-foreground">Host:</span> {log.hostName}
                </p>
              ) : null}
              {log.rule ? (
                <p>
                  <span className="font-medium text-foreground">Policy:</span> {log.rule.title}
                </p>
              ) : null}
              {log.cancellationReason ? (
                <p>
                  <span className="font-medium text-foreground">Cancellation notes:</span> {log.cancellationReason}
                </p>
              ) : null}
              {log.approvalNotes && log.status !== 'pending' ? (
                <p>
                  <span className="font-medium text-foreground">Manager notes:</span> {log.approvalNotes}
                </p>
              ) : null}
            </CardContent>
            {showCancel ? (
              <div className="flex justify-end px-6 pb-4">
                <AlertDialog open={dialogOpen && activeLogId === log.id} onOpenChange={setDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" onClick={() => handleOpen(log.id)}>
                      Cancel stay
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel visitor stay?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Let your roommates and property manager know why you’re cancelling. This note is optional but
                      helpful context for the team.
                    </p>
                    <Textarea
                      value={cancelReason}
                      onChange={event => setCancelReason(event.target.value)}
                      placeholder="Share a quick reason"
                      disabled={isPending}
                      className="mt-4"
                    />
                    <AlertDialogFooter className="pt-4">
                      <AlertDialogCancel disabled={isPending}>Close</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} disabled={isPending}>
                        {isPending ? 'Cancelling…' : 'Confirm cancel'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
