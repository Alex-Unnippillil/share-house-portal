import { Fragment } from "react"

import {
  BarChart3,
  Bell,
  Bolt,
  FileText,
  Hash,
  Megaphone,
  MessageSquare,
  Pin,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

type FeedRole = "roommate" | "property_manager" | "automation"

const roleLabels: Record<FeedRole, string> = {
  roommate: "Roommate",
  property_manager: "Property manager",
  automation: "Automation",
}

const roleBadgeStyles: Record<FeedRole, string> = {
  roommate:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  property_manager:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200",
  automation:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
}

const messagingHighlights = [
  {
    title: "Threaded conversations",
    description:
      "Spin up dedicated threads for rent splits, repairs, and events with polls, reactions, and attachments.",
    icon: MessageSquare,
  },
  {
    title: "Property manager updates",
    description:
      "Pin announcements with read receipts so building-wide notices never get lost in roommate chatter.",
    icon: Pin,
  },
  {
    title: "Realtime presence",
    description:
      "Typing indicators, delivery states, and cross-device sync powered by Supabase Realtime.",
    icon: Users,
  },
  {
    title: "Moderation controls",
    description:
      "Flag, archive, or escalate threads so property managers can maintain a respectful household community.",
    icon: ShieldCheck,
  },
]

const messagingMetrics = [
  {
    label: "Active threads",
    value: "18",
    helper: "Across 4 shared units this week",
  },
  {
    label: "Median reply time",
    value: "12 min",
    helper: "Realtime nudges keep conversations moving",
  },
  {
    label: "Announcements read",
    value: "98%",
    helper: "Roommates acknowledge critical updates",
  },
]

const roommateFeed = [
  {
    id: "update-1",
    channel: "#unit-2a",
    timestamp: "2 minutes ago",
    author: {
      name: "Jamie Chen",
      role: "roommate" as const,
      fallback: "JC",
    },
    message:
      "Picked up the replacement HVAC filters from the hardware store. I can swap them Friday evening unless anyone prefers Saturday morning instead.",
    attachments: ["Filter-receipt.jpg"],
    reactions: [
      { emoji: "👍", count: 3 },
      { emoji: "🙌", count: 2 },
    ],
    replies: 4,
    reads: 5,
  },
  {
    id: "update-2",
    channel: "#announcements",
    timestamp: "1 hour ago",
    author: {
      name: "Simone Patel",
      role: "property_manager" as const,
      fallback: "SP",
    },
    message:
      "Fire alarm testing is scheduled for tomorrow at 10:00 AM. Tests take about 15 minutes—please open a window if you plan to be home.",
    attachments: ["Testing-checklist.pdf"],
    reactions: [{ emoji: "✅", count: 12 }],
    replies: 6,
    reads: 18,
    pinned: true,
  },
  {
    id: "update-3",
    channel: "#unit-2a",
    timestamp: "Yesterday",
    author: {
      name: "Caleb Rivers",
      role: "roommate" as const,
      fallback: "CR",
    },
    message:
      "Poll results are in: game night shifts to Thursday at 8 PM this week. I'll cover snacks—@Jamie, can you bring drinks?",
    poll: {
      question: "Which night works for game night?",
      leadingOption: "Thursday · 4 votes",
      totalVotes: 7,
    },
    reactions: [{ emoji: "🎉", count: 4 }],
    replies: 2,
    reads: 5,
  },
  {
    id: "update-4",
    channel: "#maintenance",
    timestamp: "2 days ago",
    author: {
      name: "Automation",
      role: "automation" as const,
      fallback: "AU",
    },
    message:
      "Work order #4821 was marked complete by SkyFix. Please confirm the dishwasher repair resolved the leak within 24 hours.",
    reactions: [{ emoji: "👍", count: 5 }],
    replies: 1,
    reads: 6,
    automation: "Follow-up reminder",
  },
]

const composerShortcuts = [
  {
    label: "Announcement",
    icon: Megaphone,
  },
  {
    label: "Poll",
    icon: BarChart3,
  },
  {
    label: "Maintenance",
    icon: Wrench,
  },
  {
    label: "Document",
    icon: FileText,
  },
]

const moderationQueue = [
  {
    id: "queue-1",
    thread: "Visitor policy clarification",
    summary: "Auto-moderation paused this post to double-check language about overnight guests before it reaches #unit-3b.",
    flaggedBy: "Auto-moderation",
    status: "Needs review",
    severity: "medium" as const,
  },
  {
    id: "queue-2",
    thread: "Appliance replacement timeline",
    summary: "Property manager requested acknowledgement from each roommate before closing the upgrade ticket.",
    flaggedBy: "Property manager",
    status: "Awaiting roommate replies",
    severity: "low" as const,
  },
]

const severityStyles = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  high: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
}

const channelDirectory = [
  {
    name: "#announcements",
    audience: "All tenants",
    description: "Building-wide notices, safety checks, and policy updates authored by property managers only.",
    cadence: "Pinned for 72 hours with read receipts",
  },
  {
    name: "#unit-2a",
    audience: "Roommates",
    description: "Coordinate chores, deliveries, and visitor plans with the people you share space with.",
    cadence: "Active all day with quiet hours after 10 PM",
  },
  {
    name: "#maintenance",
    audience: "Tenants & manager",
    description: "Automatic updates from work orders, technician arrivals, and completion confirmations.",
    cadence: "Synced from maintenance ticketing system",
  },
]

const automationRules = [
  {
    name: "Rent reminder",
    description: "Post a friendly ping three days before rent is due and tag roommates missing autopay.",
    trigger: "Monthly · 27th",
  },
  {
    name: "Maintenance follow-up",
    description: "Check-in 24 hours after a request is resolved to capture photos or reopen the ticket.",
    trigger: "When work order closes",
  },
  {
    name: "Guest stay alerts",
    description: "Notify property managers when a visitor stay exceeds policy limits for quick approval.",
    trigger: "Visitor logs > 3 nights",
  },
]

export default function MessagingPage() {
  return (
    <div className="container max-w-6xl space-y-12 py-12">
      <header className="space-y-4">
        <div className="space-y-3">
          <Badge
            variant="outline"
            className="flex w-fit items-center gap-1 border-primary/30 bg-primary/10 text-primary"
          >
            <Bolt className="size-3.5" />
            Supabase Realtime feed
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Messaging</h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Stay connected with roommates and property managers using a realtime feed purpose-built for shared living.
            </p>
          </div>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {messagingHighlights.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.title}>
              <CardHeader className="space-y-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-muted-foreground/20">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>House feed preview</CardTitle>
              <CardDescription>
                Realtime updates stream from role-based channels with read receipts and reactions.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              Active now
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-6">
                {roommateFeed.map((activity, index) => (
                  <Fragment key={activity.id}>
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback>{activity.author.fallback}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{activity.author.name}</p>
                          <Badge
                            variant="outline"
                            className={`${roleBadgeStyles[activity.author.role]} text-[0.7rem]`}
                          >
                            {roleLabels[activity.author.role]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">• {activity.timestamp}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="flex items-center gap-1 border-dashed">
                            <Hash className="size-3" />
                            {activity.channel}
                          </Badge>
                          {activity.pinned ? (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                            >
                              <Pin className="size-3" />
                              Pinned
                            </Badge>
                          ) : null}
                          {activity.automation ? (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 border-primary/30 bg-primary/10 text-primary"
                            >
                              <Bolt className="size-3" />
                              {activity.automation}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{activity.message}</p>
                        {activity.attachments?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {activity.attachments.map((attachment) => (
                              <Badge
                                key={attachment}
                                variant="outline"
                                className="flex items-center gap-1 border-border/60 bg-muted/40 text-[0.7rem]"
                              >
                                <FileText className="size-3.5" />
                                {attachment}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {activity.poll ? (
                          <div className="space-y-1 rounded-lg border border-dashed bg-muted/40 p-3">
                            <p className="text-[0.7rem] font-medium uppercase text-muted-foreground">
                              Poll results
                            </p>
                            <p className="text-sm font-medium text-foreground">{activity.poll.question}</p>
                            <p className="text-xs text-muted-foreground">
                              Leading option: {activity.poll.leadingOption} · {activity.poll.totalVotes} votes
                            </p>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="size-3.5" />
                            <span>{activity.replies} replies</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            <span>{activity.reads} read</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {activity.reactions.map((reaction) => (
                              <span
                                key={`${activity.id}-${reaction.emoji}`}
                                className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[0.7rem]"
                              >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < roommateFeed.length - 1 ? <Separator /> : null}
                  </Fragment>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Start a new update</CardTitle>
              <CardDescription>
                Draft announcements, polls, or quick notes and choose exactly which roommates are notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Share a note with your house…"
                className="min-h-[120px] resize-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                {composerShortcuts.map((shortcut) => {
                  const Icon = shortcut.icon

                  return (
                    <Badge
                      key={shortcut.label}
                      variant="outline"
                      className="flex items-center gap-1 rounded-full border-dashed px-3 py-1 text-xs"
                    >
                      <Icon className="size-3.5" />
                      {shortcut.label}
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4" />
                <span>Shared with current leaseholders</span>
              </div>
              <Button size="sm">Post update</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Moderation queue</CardTitle>
              <CardDescription>
                Keep discussions respectful with auto-flagging, escalation, and audit history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {moderationQueue.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{item.thread}</p>
                    <Badge
                      variant="outline"
                      className={`${severityStyles[item.severity]} text-[0.7rem]`}
                    >
                      {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} priority
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.summary}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase text-muted-foreground">
                    <span>Flagged by {item.flaggedBy}</span>
                    <span>· {item.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                View full audit log
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {messagingMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Channel directory</CardTitle>
              <CardDescription>
                Guide roommates to the right place for each conversation with scoped access and quiet hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {channelDirectory.map((channel) => (
                <div
                  key={channel.name}
                  className="space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Hash className="size-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">{channel.name}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[0.65rem] uppercase tracking-wide"
                    >
                      {channel.audience}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{channel.description}</p>
                  <p className="text-xs text-muted-foreground">{channel.cadence}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation recipes</CardTitle>
              <CardDescription>
                Let Supabase functions schedule reminders, follow-ups, and targeted alerts for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {automationRules.map((rule) => (
                <div
                  key={rule.name}
                  className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 border-primary/30 bg-primary/10 text-primary"
                    >
                      <Bell className="size-3.5" />
                      {rule.trigger}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Manage automations
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  )
}
