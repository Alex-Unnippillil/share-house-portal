import PollCenter from "@/components/messaging/poll-center"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { MessageSummary, RoommateProfile, ThreadSummary } from "@/lib/poll-manager"

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

const roommateProfiles: RoommateProfile[] = [
  { id: "alex-rivera", name: "Alex Rivera" },
  { id: "jamie-chen", name: "Jamie Chen" },
  { id: "morgan-patel", name: "Morgan Patel" },
  { id: "sasha-ibarra", name: "Sasha Ibarra" },
]

const threadSummaries: ThreadSummary[] = [
  {
    id: "thread-chores",
    title: "Weekly chore rotation",
    summary: "Align on the cleaning cadence for shared spaces.",
  },
  {
    id: "thread-groceries",
    title: "Bulk grocery order",
    summary: "Coordinate staples before the monthly Costco run.",
  },
  {
    id: "thread-events",
    title: "Summer roommate events",
    summary: "Plan July game nights and patio dinners.",
  },
]

const threadMessages: MessageSummary[] = [
  {
    id: "message-chores-1",
    threadId: "thread-chores",
    authorId: "alex-rivera",
    body: "I drafted a kitchen/living room/bathroom rotation. Open to adjustments if a weekday works better.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "message-chores-2",
    threadId: "thread-chores",
    authorId: "jamie-chen",
    body: "Could we swap the deep clean to midweek so weekends stay open?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
  },
  {
    id: "message-groceries-1",
    threadId: "thread-groceries",
    authorId: "morgan-patel",
    body: "I'm putting together the Costco list. Drop any specialty items before Friday night.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "message-events-1",
    threadId: "thread-events",
    authorId: "sasha-ibarra",
    body: "Let's pick a weekend for a patio dinner. I can handle grilling if someone covers sides!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
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
      <PollCenter messages={threadMessages} roommates={roommateProfiles} threads={threadSummaries} />
    </div>
  )
}
