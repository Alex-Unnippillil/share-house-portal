import { PropertyManagerUpdates } from "@/components/messaging/property-manager-updates"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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

export default function MessagingPage() {
  return (
    <div className="container max-w-5xl space-y-12 py-12">
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
      <PropertyManagerUpdates />
    </div>
  )
}
