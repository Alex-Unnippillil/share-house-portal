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
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Activity,
  CheckCheck,
  Clock3,
  Headphones,
  Mic,
  Paperclip,
  Phone,
  Radio,
  Send,
  Smile,
  Video,
} from "lucide-react"

type ConversationStatus = "Live" | "Monitoring" | "Quiet"

type Conversation = {
  id: string
  title: string
  subtitle: string
  lastMessage: string
  status: ConversationStatus
  unread: number
  typing?: string
  online: number
  totalParticipants: number
  tags: string[]
  escalated?: boolean
}

type LiveMessage = {
  id: string
  author?: {
    name: string
    initials: string
    role: string
    accent: string
    activity: string
  }
  timestamp: string
  content: string[]
  status?: string
  metrics?: string
  attachments?: {
    label: string
    meta: string
  }[]
  reactions?: {
    emoji: string
    count: number
    active?: boolean
  }[]
  system?: boolean
}

type Presence = {
  name: string
  role: string
  status: string
  accent: string
  device: string
}

type SyncIndicator = {
  id: string
  title: string
  description: string
  value: number
  tone: "success" | "warning" | "info"
}

type FollowUp = {
  id: string
  title: string
  detail: string
  due: string
  owner: string
}

const conversationStatusStyles: Record<ConversationStatus, string> = {
  Live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  Monitoring: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  Quiet: "border-border bg-muted/40 text-muted-foreground",
}

const conversations: Conversation[] = [
  {
    id: "unit-3b-chore-sync",
    title: "Unit 3B • Deep clean sprint",
    subtitle: "Live chore rotation planning",
    lastMessage: "Maya: Posting the consolidated checklist now.",
    status: "Live",
    unread: 4,
    typing: "Maya",
    online: 5,
    totalParticipants: 6,
    tags: ["Chores", "Poll running"],
    escalated: true,
  },
  {
    id: "wifi-upgrade-field",
    title: "Wi-Fi upgrade deployment",
    subtitle: "Installer coordination thread",
    lastMessage: "Avery scheduled the onsite visit for Tuesday 3 PM.",
    status: "Monitoring",
    unread: 1,
    typing: "Jordan",
    online: 3,
    totalParticipants: 4,
    tags: ["Maintenance"],
  },
  {
    id: "grocery-coop-live",
    title: "Shared pantry restock",
    subtitle: "June grocery co-op planning",
    lastMessage: "Diego uploaded a fresh price comparison sheet.",
    status: "Monitoring",
    unread: 0,
    online: 4,
    totalParticipants: 6,
    tags: ["Logistics"],
  },
  {
    id: "guest-policy-briefing",
    title: "Visitor policy refresh",
    subtitle: "Manager announcement with Q&A",
    lastMessage: "Pinned decision: 3-night limit with advance notice.",
    status: "Quiet",
    unread: 0,
    online: 2,
    totalParticipants: 5,
    tags: ["House rules"],
  },
]

const liveMessages: LiveMessage[] = [
  {
    id: "system-live-boost",
    timestamp: "9:10 AM",
    content: ["Realtime sync verified · All roommates connected"],
    system: true,
  },
  {
    id: "maya-update",
    author: {
      name: "Maya Patel",
      initials: "MP",
      role: "Host roommate",
      accent: "bg-sky-500/15 text-sky-700",
      activity: "Drafting poll recap",
    },
    timestamp: "9:12 AM",
    content: [
      "Wrapping the poll now — Saturday 10 AM is leading with 6 votes, Sunday 11 AM has 3.",
      "I consolidated the deep clean checklist and assigned point people per room. Let me know if any swaps are needed before I lock it.",
    ],
    status: "Seen by 5",
    metrics: "Poll closes in 2h · Autoreminder armed",
    attachments: [
      {
        label: "Q2 deep clean.xlsx",
        meta: "Version 4 · Updated just now",
      },
    ],
    reactions: [
      { emoji: "👍", count: 4, active: true },
      { emoji: "🧽", count: 2 },
    ],
  },
  {
    id: "jordan-check",
    author: {
      name: "Jordan Lee",
      initials: "JL",
      role: "Roommate",
      accent: "bg-amber-500/15 text-amber-700",
      activity: "Replying from mobile",
    },
    timestamp: "9:14 AM",
    content: [
      "Confirmed — I can trade recycling duty with Diego if we keep Saturday morning.",
      "Also dropping in a quick video walkthrough of the fridge zones so new roommates know what shelf is theirs.",
    ],
    status: "Delivered · Mobile",
    attachments: [
      {
        label: "Fridge zones.mov",
        meta: "56 seconds · Auto-captioning",
      },
    ],
    reactions: [{ emoji: "🙌", count: 3 }],
  },
  {
    id: "avery-ops",
    author: {
      name: "Avery Chen",
      initials: "AC",
      role: "Property manager",
      accent: "bg-purple-500/15 text-purple-700",
      activity: "On call",
    },
    timestamp: "9:18 AM",
    content: [
      "Love the momentum here. I'll archive the old rotation thread once this poll closes and mirror the assignments into the documents hub.",
      "Quiet hours reminder is scheduled for Friday night, and compliance already cleared the visitor policy update.",
    ],
    status: "Manager pinned",
    metrics: "Escalation target: keep flagged messages under 1",
  },
  {
    id: "system-handoff",
    timestamp: "9:20 AM",
    content: ["Supabase automation: status report sent to maintenance queue"],
    system: true,
  },
]

const presence: Presence[] = [
  {
    name: "Maya Patel",
    role: "Host roommate",
    status: "Replying now",
    accent: "border-sky-500/30 bg-sky-500/10 text-sky-700",
    device: "Mobile · 5s ago",
  },
  {
    name: "Jordan Lee",
    role: "Roommate",
    status: "Listening on web",
    accent: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    device: "Desktop · 12s ago",
  },
  {
    name: "Diego Alvarez",
    role: "Roommate",
    status: "In call",
    accent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    device: "Kitchen tablet",
  },
  {
    name: "Avery Chen",
    role: "Property manager",
    status: "Monitoring",
    accent: "border-purple-500/30 bg-purple-500/10 text-purple-700",
    device: "Ops dashboard",
  },
]

const syncIndicators: SyncIndicator[] = [
  {
    id: "delivery",
    title: "Delivery health",
    description: "Realtime channel uptime",
    value: 98,
    tone: "success",
  },
  {
    id: "responses",
    title: "Response pace",
    description: "Median reply speed (seconds)",
    value: 45,
    tone: "info",
  },
  {
    id: "moderation",
    title: "Moderation load",
    description: "Flagged messages this hour",
    value: 22,
    tone: "warning",
  },
]

const followUps: FollowUp[] = [
  {
    id: "rotation-pdf",
    title: "Publish finalized rotation PDF",
    detail: "Sync to document vault once poll closes",
    due: "Today · 5 PM",
    owner: "Avery",
  },
  {
    id: "reminder",
    title: "Send quiet hours reminder",
    detail: "Automation scheduled for Friday 8 PM",
    due: "Scheduled",
    owner: "Automation",
  },
  {
    id: "inventory",
    title: "Confirm supply inventory",
    detail: "Match chores to cleaning supplies",
    due: "Tomorrow",
    owner: "Diego",
  },
]

export default function LiveMessengerPage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="uppercase">Realtime beta</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Live Messenger</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Coordinate roommates, property managers, and onsite teams with realtime chat, presence, and automation inside Roomsily.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600">
            <Radio className="size-3" aria-hidden /> Connected
          </span>
          <span>Latency: 42 ms edge · Supabase realtime</span>
          <span>5 participants online</span>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 xl:grid-cols-[280px,1fr,320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Active conversations</CardTitle>
                  <CardDescription>
                    Jump into live roommate threads and monitor escalations in one panel.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  New live room
                </Button>
              </div>
              <Input placeholder="Search rooms, units, or people" className="h-9" />
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "space-y-3 rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm transition hover:border-primary/50 hover:bg-primary/5",
                    conversation.status === "Live" && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground">{conversation.subtitle}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("whitespace-nowrap", conversationStatusStyles[conversation.status])}
                    >
                      {conversation.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>{conversation.lastMessage}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-1 font-medium text-foreground">
                        <Activity className="size-3" aria-hidden /> {conversation.online}/{conversation.totalParticipants} online
                      </span>
                      {conversation.typing ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-600">
                          <Mic className="size-3" aria-hidden /> {conversation.typing} typing
                        </span>
                      ) : null}
                      {conversation.unread > 0 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                          {conversation.unread} new
                        </span>
                      ) : null}
                      {conversation.escalated ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-medium text-amber-600">
                          <Headphones className="size-3" aria-hidden /> Escalation monitor
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {conversation.tags.map((tag) => (
                      <Badge key={`${conversation.id}-${tag}`} variant="secondary" className="uppercase">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>Unit 3B · Deep clean sprint</CardTitle>
                  <CardDescription>
                    Live room anchored to the chore rotation poll with realtime automations enabled.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="uppercase">Live</Badge>
                  <span>Latency 42 ms</span>
                  <span>Recording disabled</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-2">
                  <Video className="size-4" aria-hidden />
                  Start huddle
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <Phone className="size-4" aria-hidden />
                  Dial roommate
                </Button>
                <Button size="sm" variant="ghost" className="gap-2">
                  <Activity className="size-4" aria-hidden />
                  Automations
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-8 pt-6">
              {liveMessages.map((message, index) => {
                if (message.system) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Radio className="size-3" aria-hidden />
                        {message.content[0]}
                      </span>
                    </div>
                  )
                }

                return (
                  <div key={message.id} className="space-y-3">
                    <div className="flex items-start gap-4">
                      <Avatar className="ring-2 ring-primary/20">
                        <AvatarFallback className={cn("text-xs font-semibold", message.author?.accent)}>
                          {message.author?.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{message.author?.name}</p>
                          <Badge variant="outline" className={cn("text-[11px]", message.author?.accent)}>
                            {message.author?.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                          <span className="text-xs text-muted-foreground">{message.author?.activity}</span>
                        </div>
                        <div className="space-y-2 text-sm leading-relaxed text-foreground">
                          {message.content.map((paragraph, idx) => (
                            <p key={`${message.id}-content-${idx}`}>{paragraph}</p>
                          ))}
                        </div>
                        {message.attachments?.length ? (
                          <div className="space-y-2">
                            {message.attachments.map((attachment) => (
                              <div
                                key={`${message.id}-${attachment.label}`}
                                className="flex items-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-sm"
                              >
                                <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                                <div className="flex-1">
                                  <p className="font-medium text-foreground">{attachment.label}</p>
                                  <p className="text-xs text-muted-foreground">{attachment.meta}</p>
                                </div>
                                <Badge variant="outline" className="uppercase">
                                  File
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {message.status ? (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <CheckCheck className="size-3 text-primary" aria-hidden />
                              {message.status}
                            </span>
                          ) : null}
                          {message.metrics ? <span>{message.metrics}</span> : null}
                        </div>
                        {message.reactions?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {message.reactions.map((reaction) => (
                              <Button
                                key={`${message.id}-${reaction.emoji}`}
                                size="sm"
                                variant={reaction.active ? "default" : "outline"}
                                className={cn(
                                  "h-8 rounded-full px-3 text-xs",
                                  reaction.active && "bg-primary/90"
                                )}
                              >
                                <span className="mr-1 text-sm" aria-hidden>
                                  {reaction.emoji}
                                </span>
                                {reaction.count}
                              </Button>
                            ))}
                            <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs text-muted-foreground">
                              + React
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {index < liveMessages.length - 1 ? <Separator /> : null}
                  </div>
                )
              })}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-muted/20 p-6">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600">
                  <Radio className="size-3" aria-hidden />
                  Maya is typing
                </span>
                <span>Auto-transcribe enabled</span>
                <span>Message retention: 6 months</span>
              </div>
              <div className="space-y-3">
                <Textarea placeholder="Drop an update for the house..." className="min-h-[120px]" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Paperclip className="size-4" aria-hidden />
                      Attach
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Smile className="size-4" aria-hidden />
                      Emoji
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Mic className="size-4" aria-hidden />
                      Voice note
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm">
                      Schedule send
                    </Button>
                    <Button size="sm" className="gap-2">
                      Send live
                      <Send className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Presence & routing</CardTitle>
              <CardDescription>See who is online and what device they are using.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {presence.map((person) => (
                <div
                  key={person.name}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/70 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className={cn("text-xs font-semibold", person.accent)}>
                        {person.name
                          .split(" ")
                          .map((segment) => segment[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{person.name}</p>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {person.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{person.device}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
                      person.accent
                    )}
                  >
                    <Radio className="size-3" aria-hidden />
                    {person.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Realtime health</CardTitle>
              <CardDescription>Observe delivery, response, and moderation signals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncIndicators.map((indicator) => (
                <div key={indicator.id} className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm font-medium text-foreground">
                    <span>{indicator.title}</span>
                    <span>{indicator.value}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{indicator.description}</p>
                  <Progress
                    value={indicator.value}
                    className={cn(
                      indicator.tone === "success" && "bg-emerald-500/10",
                      indicator.tone === "warning" && "bg-amber-500/10",
                      indicator.tone === "info" && "bg-primary/10"
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pinned follow-ups</CardTitle>
              <CardDescription>Automations and owners keeping the room accountable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {followUps.map((item) => (
                <div key={item.id} className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.owner}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.due}</span>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                      <Clock3 className="size-4" aria-hidden />
                      Snooze
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
