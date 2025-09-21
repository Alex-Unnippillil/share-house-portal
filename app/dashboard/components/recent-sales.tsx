"use client"

import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useNotificationFeed } from "@/hooks/use-notification-feed"

const TYPE_EMOJI: Record<string, string> = {
  "message:new": "💬",
  "message:moderated": "🛡️",
  "maintenance:update": "🛠️",
}

const formatTimestamp = (timestamp: string) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch (error) {
    console.error("Failed to format timestamp", error)
    return "just now"
  }
}

export function RecentSales() {
  const notifications = useNotificationFeed()
  const items = useMemo(() => notifications.slice(0, 5), [notifications])

  if (items.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>No activity yet.</p>
        <p>Notifications from messaging and maintenance will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((notification) => {
        const emoji = TYPE_EMOJI[notification.type] ?? "💡"
        return (
          <div key={notification.id} className="flex items-start gap-3">
            <Avatar className="size-9">
              <AvatarFallback>{emoji}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{notification.title}</p>
              {notification.description && (
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(notification.createdAt)}
              </p>
            </div>
            {notification.status && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {notification.status}
              </Badge>
            )}
          </div>
        )
      })}
    </div>
  )
}
