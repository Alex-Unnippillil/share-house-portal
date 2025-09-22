import { differenceInCalendarDays, format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { type VisitorProfile } from '@/lib/visitors/repository'
import { type VisitorLogWithAudit } from '../page'
import CancelVisitorDialog from './CancelVisitorDialog'
import { formatStayWindow } from '@/lib/visitor-notifications'

interface VisitorRequestsListProps {
  logs: VisitorLogWithAudit[]
  profileId: string
  roommates: VisitorProfile[]
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'complete' }> = {
  pending: { label: 'Pending approval', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'complete' },
  denied: { label: 'Denied', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  completed: { label: 'Completed', variant: 'default' },
}

function formatRoommates(recipientIds: string[] | null | undefined, roommates: VisitorProfile[]): string {
  if (!recipientIds || recipientIds.length === 0) {
    return 'No roommates notified yet.'
  }

  const names = roommates
    .filter((roommate) => recipientIds.includes(roommate.id))
    .map((roommate) => roommate.full_name ?? roommate.email ?? 'Roommate')

  if (!names.length) {
    return 'No roommates notified yet.'
  }

  return `Roommates notified: ${names.join(', ')}`
}

export default function VisitorRequestsList({ logs, profileId, roommates }: VisitorRequestsListProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">No visitor requests yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Submit your first overnight visitor request to keep everyone in the loop.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {logs.map((log) => {
        const status = statusLabels[log.status] ?? statusLabels.pending
        const nights = differenceInCalendarDays(new Date(log.departure_date), new Date(log.arrival_date)) + 1
        const canCancel = log.host_profile_id === profileId && ['pending', 'approved'].includes(log.status)
        const roommateSummary = formatRoommates(log.roommate_recipient_ids ?? [], roommates)

        return (
          <Card key={log.id} className="shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">{log.guest_full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatStayWindow(log.arrival_date, log.departure_date)} • {nights} night{nights === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {canCancel && <CancelVisitorDialog logId={log.id} guestName={log.guest_full_name} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-sm font-medium">{format(new Date(log.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guests expected</p>
                  <p className="text-sm font-medium">{log.expected_guests}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notified</p>
                  <p className="text-sm font-medium">{roommateSummary}</p>
                </div>
              </div>

              {log.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="text-sm">{log.reason}</p>
                </div>
              )}

              {log.denial_reason && log.status === 'denied' && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Denial reason: {log.denial_reason}
                </div>
              )}

              {log.cancellation_reason && log.status === 'cancelled' && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  Cancellation reason: {log.cancellation_reason}
                </div>
              )}

              {log.audits.length > 0 && (
                <div>
                  <Separator className="my-2" />
                  <p className="text-sm font-semibold">Activity</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {log.audits.map((event) => (
                      <li key={event.id} className="leading-relaxed">
                        <span className="font-medium text-foreground">
                          {format(new Date(event.created_at), 'PPpp')}
                        </span>{' '}
                        — {event.event_type.replace('notification:', 'notification ')}
                        {event.message ? ` • ${event.message}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
