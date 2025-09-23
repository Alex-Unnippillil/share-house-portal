import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardAudience, getRoommateUpdates } from "../data"
import { Badge } from "@/components/ui/badge"
import SmartLink from "@/components/navigation/SmartLink"
import { MessageSquare } from "lucide-react"

const topicCopy: Record<"maintenance" | "announcement" | "logistics", { label: string; variant: "outline" | "secondary" | "default" }>
  = {
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
  const [updates, audience] = await Promise.all([
    getRoommateUpdates(),
    getDashboardAudience(),
  ])

  const title = audience === "manager" ? "Resident activity" : "Roommate board"
  const description =
    audience === "manager"
      ? "Check in on resident updates and announcements across your portfolio."
      : "Keep the household in sync with quick updates and replies."
  const emptyCopy =
    audience === "manager"
      ? "No updates yet. Encourage residents to post announcements or maintenance notes."
      : "No updates yet. Share a note to keep your household and property team on the same page."
  const ctaLabel = audience === "manager" ? "Open portfolio feed" : "Open message board"

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="size-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.length ? (
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
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(update.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{update.message}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        )}

        <SmartLink href="/messaging" className="inline-flex" intent="navigation">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            {ctaLabel}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
