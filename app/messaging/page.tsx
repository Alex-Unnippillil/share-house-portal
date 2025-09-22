import { formatDistanceToNow } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createSupbaseServerClient } from "@/utils/supaone"
import { cn } from "@/lib/utils"
import type { IncidentSeverity, IncidentUpdate } from "@/lib/incidents/types"
import { humanizeLabel, severityBadgeStyles } from "@/lib/incidents/presentation"

const messagingHighlights = [
  {
    title: "Threaded conversations",
    description:
      "Organize roommate discussions by topic with reactions, polls, and attachments to keep everyone aligned.",
  },
  {
    title: "Property manager updates",
    description:
      "Pinned announcements and maintenance notifications ensure tenants never miss critical information.",
  },
  {
    title: "Realtime presence",
    description:
      "Supabase Realtime keeps typing indicators and read receipts in sync across roommates and devices.",
  },
  {
    title: "Moderation controls",
    description:
      "Flag, archive, or escalate threads so property managers can maintain a respectful household community.",
  },
]

type IncidentFeedEntry = IncidentUpdate & {
  incidents: {
    id: string
    title: string | null
    household_id: string | null
  } | null
  author: {
    id: string
    full_name: string | null
  } | null
}

async function getIncidentFeed(): Promise<IncidentFeedEntry[]> {
  const supabase = await createSupbaseServerClient()
  const { data, error } = await supabase
    .from("incident_updates")
    .select(
      `id, message, created_at, status, severity,
       incidents:incident_id (id, title, household_id),
       author:author_id (id, full_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    console.error("Failed to load incident feed", error)
    return []
  }

  return (data ?? []) as IncidentFeedEntry[]
}

export default async function MessagingPage() {
  const incidentFeed = await getIncidentFeed()

  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Messaging</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Stay connected with roommates and property managers using a realtime feed purpose-built for shared living.
          </p>
        </div>
        <Separator />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {messagingHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Incident updates</h2>
          <p className="text-sm text-muted-foreground">
            Every status change from the incidents dashboard is posted here so the household stays informed in real time.
          </p>
        </div>
        <div className="grid gap-4">
          {incidentFeed.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Incident activity will appear here after the first report is triaged.
              </CardContent>
            </Card>
          ) : (
            incidentFeed.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {entry.incidents?.title ?? "Incident update"}
                    </CardTitle>
                    <CardDescription>
                      Household {entry.incidents?.household_id ?? "unknown"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={cn("capitalize", severityBadgeStyles[entry.severity as IncidentSeverity])}>
                      {humanizeLabel(entry.severity)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {humanizeLabel(entry.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm leading-relaxed">{entry.message}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.author?.full_name ?? "System"}</span>
                    <span aria-hidden>•</span>
                    <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
