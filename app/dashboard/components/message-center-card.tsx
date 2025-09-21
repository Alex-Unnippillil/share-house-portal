import { formatDistanceToNow } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { MessageAlert } from "../lib/data-sources"

type MessageCenterCardProps = {
  threads: MessageAlert[]
}

export function MessageCenterCard({ threads }: MessageCenterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Message center</CardTitle>
        <CardDescription>Resident conversations requiring manager attention.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {threads.map((thread) => (
            <li key={thread.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{thread.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Last activity {formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {thread.unresolved ? <Badge variant="destructive">Unresolved</Badge> : null}
                  {thread.unreadCount > 0 ? (
                    <Badge variant="secondary">{thread.unreadCount} unread</Badge>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
          {threads.length === 0 ? (
            <li className="rounded-md border border-dashed border-border p-4 text-center text-muted-foreground">
              All conversations are resolved.
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}
