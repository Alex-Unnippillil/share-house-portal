import { Badge, type BadgeProps } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  WebhookReplayAuditEntry,
  WebhookReplayAuditStatus,
} from "@/lib/data/webhook-deliveries"

type ReplayAuditLogProps = {
  entries: WebhookReplayAuditEntry[]
}

const STATUS_VARIANTS: Record<
  WebhookReplayAuditStatus,
  BadgeProps["variant"]
> = {
  queued: "secondary",
  completed: "complete",
  failed: "destructive",
}

const STATUS_LABELS: Record<WebhookReplayAuditStatus, string> = {
  queued: "Queued",
  completed: "Completed",
  failed: "Failed",
}

const formatTimestamp = (timestamp: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp))
  } catch (error) {
    return timestamp
  }
}

export function ReplayAuditLog({ entries }: ReplayAuditLogProps) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader>
        <CardTitle>Replay audit trail</CardTitle>
        <CardDescription>
          Every manual or automatic replay is captured for compliance and
          troubleshooting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            No replay activity recorded yet.
          </div>
        ) : (
          <ol className="space-y-4">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-border/60 bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      Delivery {entry.deliveryId} • Attempt {entry.attemptNumber}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.message}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(entry.triggeredAt)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={STATUS_VARIANTS[entry.status]}>
                    {STATUS_LABELS[entry.status]}
                  </Badge>
                  <Badge variant="outline">{entry.actor}</Badge>
                  <Badge variant="outline">{entry.targetUrl}</Badge>
                  {entry.reason ? (
                    <Badge variant="outline">Reason: {entry.reason}</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
