"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import useThreadPresence from "@/hooks/use-thread-presence"
import { getReadableTextColor } from "@/lib/color"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  error: "Connection issue",
  offline: "Offline",
}

const STATUS_COLOR: Record<string, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-400",
  error: "bg-destructive",
  offline: "bg-muted-foreground/60",
}

const MAX_VISIBLE_AVATARS = 4

type ThreadPresenceIndicatorProps = {
  threadId: string
  className?: string
}

export default function ThreadPresenceIndicator({
  threadId,
  className,
}: ThreadPresenceIndicatorProps) {
  const { users, status, viewer } = useThreadPresence(threadId)

  const visibleUsers = users.slice(0, MAX_VISIBLE_AVATARS)
  const overflow = Math.max(users.length - MAX_VISIBLE_AVATARS, 0)
  const typingUsers = users.filter((user) => user.typing && !user.isSelf)

  const statusLabel = STATUS_LABEL[status] ?? STATUS_LABEL.connecting
  const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.connecting

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span
          aria-hidden
          className={cn("inline-flex size-2 rounded-full", statusColor)}
        />
        <span className="font-medium text-foreground">Live presence</span>
        <span className="text-muted-foreground">{statusLabel}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Avatar
              key={user.connectionId}
              className="size-8 border-2 border-background shadow-sm"
              aria-label={`${user.name} is viewing this thread`}
            >
              <AvatarFallback
                className="text-[11px] font-semibold uppercase"
                style={{
                  backgroundColor: user.color,
                  color: getReadableTextColor(user.color),
                }}
              >
                {user.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-foreground">
            {users.length} roommate{users.length === 1 ? "" : "s"} here now
          </span>
          {typingUsers.length > 0 ? (
            <span>
              {typingUsers
                .map((user) => user.name)
                .join(", ")}{" "}
              typing…
            </span>
          ) : viewer ? (
            <span>Signed in as {viewer.name}</span>
          ) : null}
        </div>
        {overflow > 0 ? (
          <Badge variant="secondary" className="uppercase">
            +{overflow}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}
