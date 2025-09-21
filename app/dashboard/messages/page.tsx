import { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Messaging",
  description: "Coordinate chores, polls, and announcements with realtime threads.",
}

const messagingHighlights = [
  {
    title: "House feed",
    description: "Start threads for chores, supply restocks, and policy reminders with reactions for quick consensus.",
  },
  {
    title: "Urgent alerts",
    description: "Escalate maintenance emergencies or security issues to property managers with push notifications.",
  },
  {
    title: "Moderation tools",
    description: "Pin important updates, archive old conversations, and flag content that violates community guidelines.",
  },
]

export default function MessagesPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Messaging hub</h1>
        <p className="text-muted-foreground">
          Supabase Realtime keeps every roommate conversation in sync so updates, polls, and maintenance responses reach the right
          people instantly.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {messagingHighlights.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Thread subscriptions let roommates follow the topics that matter while muting the rest.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
