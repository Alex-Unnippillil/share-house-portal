import { MessageSquare } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SmartLink from "@/components/navigation/SmartLink"

import { getRoommateUpdates } from "../data"

const topicCopy: Record<
  "maintenance" | "announcement" | "logistics",
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  maintenance: {
    label: "Maintenance",
    variant: "outline",
  },
  announcement: {
    label: "Announcement",
    variant: "secondary",
  },
  logistics: {
    label: "Logistics",
    variant: "default",
  },
}

function formatRelativeTime(timestamp: string) {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()

  const minutes = Math.round(diff / (1000 * 60))
  if (minutes < 1) {
    return "Just now"
  }
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} hr${hours > 1 ? "s" : ""} ago`
  }
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? "s" : ""} ago`
}

export async function RoommateBoardCard() {
  const updates = await getRoommateUpdates()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="size-5 text-primary" />
            Roommate board
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep the household in sync with quick updates and replies.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {updates.map((update) => {
            const { label, variant } = topicCopy[update.topic]
            return (
              <li
                key={update.id}
                className="rounded-lg border border-transparent bg-muted/40 p-3 transition-colors hover:border-border/70 hover:bg-muted/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>{update.author}</span>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(update.timestamp)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {update.message}
                </p>
              </li>
            )
          })}
        </ul>

        <SmartLink
          href="/messaging"
          className="inline-flex"
          intent="navigation"
        >
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Open message board
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
