import { formatDistanceToNow, parseISO } from 'date-fns'

import type { VisitorAuditEntryView } from '@/types/visitors'

interface VisitorAuditTrailProps {
  entries: VisitorAuditEntryView[]
}

export function VisitorAuditTrail({ entries }: VisitorAuditTrailProps) {
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">No recent actions recorded for this request.</p>
    )
  }

  return (
    <ul className="space-y-3 text-sm text-muted-foreground">
      {entries.map(entry => {
        const decision =
          entry.metadata && typeof entry.metadata === 'object'
            ? (entry.metadata as Record<string, unknown>).decision
            : undefined

        let actionLabel = entry.action
        if (entry.action === 'status_change' && typeof decision === 'string') {
          actionLabel = `status ${decision}`
        }

        return (
          <li key={entry.id} className="rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground capitalize">{actionLabel}</span>
              <span>
                {formatDistanceToNow(parseISO(entry.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              {entry.actorName ? (
                <p>
                  <span className="font-medium text-foreground">By:</span> {entry.actorName}
                  {entry.actorRole ? ` (${entry.actorRole})` : ''}
                </p>
              ) : null}
              {entry.notes ? (
                <p>
                  <span className="font-medium text-foreground">Notes:</span> {entry.notes}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
