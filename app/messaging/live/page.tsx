import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Activity,
  ArrowUpRight,
  Broadcast,
  CheckCircle2,
  Circle,
  Clock,
  Mic,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Video,
  Wifi,
} from "lucide-react"

const liveRooms = [
  {
    id: "house-ops",
    name: "House ops war room",
    summary: "Coordinating leak cleanup & plumber scheduling",
    unread: 3,
    live: true,
    typing: "Jordan is capturing photos…",
    watchers: 6,
    priority: "high",
    lastUpdate: "Active now",
  },
  {
    id: "guest-approvals",
    name: "Overnight guest approvals",
    summary: "Queue for visitor requests and policy checks",
    unread: 0,
    live: false,
    watchers: 4,
    lastUpdate: "Updated 12m ago",
  },
  {
    id: "payroll",
    name: "Rent receipts",
    summary: "Sync on late payments and reimbursements",
    unread: 1,
    live: false,
    watchers: 3,
    lastUpdate: "Last post 42m ago",
  },
  {
    id: "amenities",
    name: "Amenity coordination",
    summary: "Kitchen reset & TV room swaps",
    unread: 5,
    live: false,
    typing: "Maya is drafting a poll",
    watchers: 7,
    lastUpdate: "New poll pending",
  },
]

const messageTranscript = [
  {
    id: "ops-reopen",
    type: "system" as const,
    timestamp: "09:18",
    content: [
      "Channel reopened for leak remediation. Timeline, decisions, and tasks will stream to the household dashboard.",
    ],
  },
  {
    id: "maya-update",
    author: "Maya Patel",
    initials: "MP",
    accent: "bg-sky-500/20 text-sky-700",
    role: "Host roommate",
    timestamp: "09:19",
    content: [
      "Maintenance crew confirmed the entry window between 3:30–4:00 PM. They asked us to keep the laundry hallway cleared.",
      "I uploaded photos of the affected drywall so Avery can approve the emergency spend without delays.",
    ],
    attachments: [
      {
        label: "Laundry hallway 09-19.jpg",
        description: "2.1 MB · Uploaded to maintenance log",
      },
      {
        label: "Leak escalation checklist.pdf",
        description: "Shared from maintenance playbook",
      },
    ],
    reactions: [
      { emoji: "✅", count: 4, active: true },
      { emoji: "📸", count: 2 },
    ],
  },
  {
    id: "jordan-response",
    author: "Jordan Lee",
    initials: "JL",
    accent: "bg-amber-500/20 text-amber-700",
    role: "Roommate",
    timestamp: "09:21",
    content: [
      "I can stay home for access. Logging the plumber ETA now so the property manager sees it in the ops feed.",
      "Will vacuum the hallway and move the shoe rack before they arrive.",
    ],
    reactions: [
      { emoji: "👍", count: 3 },
      { emoji: "🧹", count: 1 },
    ],
  },
  {
    id: "avery-pin",
    author: "Avery Chen",
    initials: "AC",
    accent: "bg-purple-500/20 text-purple-700",
    role: "Property manager",
    timestamp: "09:22",
    content: [
      "Thanks both. Pinned the cleanup checklist and approved the emergency spend. Supabase ledger updated for accounting.",
      "If the plumber needs additional access, trigger a live ping using the button below and I can remote in.",
    ],
    attachments: [
      {
        label: "Cleanup checklist v2.xlsx",
        description: "Live in shared supplies drive",
      },
    ],
    reactions: [{ emoji: "🙌", count: 4 }],
  },
  {
    id: "system-sync",
    type: "system" as const,
    timestamp: "09:24",
    content: [
      "Supabase sync complete — maintenance ticket #482 escalated and Cal.com blocked laundry hallway during visit window.",
    ],
  },
]

const presence = [
  {
    name: "Maya Patel",
    role: "Host roommate",
    status: "online" as const,
    focus: "Uploading receipts",
  },
  {
    name: "Jordan Lee",
    role: "Roommate",
    status: "online" as const,
    focus: "On-site for plumber",
  },
  {
    name: "Avery Chen",
    role: "Property manager",
    status: "away" as const,
    focus: "Reviewing invoices",
  },
  {
    name: "Noor Singh",
    role: "Roommate",
    status: "offline" as const,
    focus: "Will receive recap",
  },
]

const actionQueue = [
  {
    id: "plumber-entry",
    title: "Confirm entry window",
    description: "Jordan to greet crew at 3:30 PM and share keypad code.",
    due: "Due in 2h",
    priority: "urgent" as const,
  },
  {
    id: "expenses",
    title: "Upload expense receipt",
    description: "Maya to forward plumber invoice for reimbursement tracking.",
    due: "Due tonight",
    priority: "soon" as const,
  },
  {
    id: "inspection",
    title: "Post remediation photos",
    description: "Avery will request inspection follow-up once work is complete.",
    due: "Awaiting",
    priority: "normal" as const,
  },
]

const pinnedResources = [
  {
    id: "checklist",
    title: "Laundry leak cleanup checklist",
    meta: "Pinned by Avery • Updated 3m ago",
    type: "Spreadsheet",
  },
  {
    id: "policy",
    title: "Emergency vendor access policy",
    meta: "Shared from documents hub",
    type: "Policy",
  },
  {
    id: "ticket",
    title: "Maintenance ticket #482",
    meta: "Synced from Supabase",
    type: "Ticket",
  },
]

const liveActivity = [
  {
    id: "timeline-1",
    actor: "Jordan",
    time: "09:17",
    description: "Logged plumber ETA and visitor badge ID.",
    type: "update" as const,
  },
  {
    id: "timeline-2",
    actor: "System",
    time: "09:12",
    description: "Cal.com blocked laundry hallway for maintenance window.",
    type: "sync" as const,
  },
  {
    id: "timeline-3",
    actor: "Avery",
    time: "08:58",
    description: "Approved emergency maintenance spend with Documenso trail.",
    type: "approval" as const,
  },
]

const presenceStatusStyles = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-zinc-400",
}

const actionQueueBadgeStyles = {
  urgent: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  soon: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  normal: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
}

const activityIconStyles = {
  update: { icon: Activity, tone: "text-sky-600" },
  sync: { icon: Wifi, tone: "text-emerald-600" },
  approval: { icon: CheckCircle2, tone: "text-purple-600" },
}

export default function LiveMessengerPage() {
  return (
    <div className="container max-w-6xl space-y-8 py-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Live Messenger
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Coordinate urgent situations in real time with presence, pinned
              context, and synced tasks across the household.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Badge variant="outline" className="flex items-center gap-2 text-xs">
              <Wifi className="size-3" aria-hidden />
              Supabase realtime linked
            </Badge>
            <Button size="sm" className="w-full sm:w-auto">
              Start huddle
              <ArrowUpRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr] xl:grid-cols-[280px,1.4fr,260px]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Live rooms</CardTitle>
              <Button size="icon" variant="outline" className="size-8">
                <Plus className="size-4" aria-hidden />
                <span className="sr-only">Create live room</span>
              </Button>
            </div>
            <CardDescription>
              Switch between realtime spaces and see who is actively present.
            </CardDescription>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search rooms or roommates"
                className="pl-9"
                type="search"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[480px] pr-2">
              <div className="space-y-3">
                {liveRooms.map((room) => (
                  <button
                    key={room.id}
                    className={cn(
                      "w-full space-y-2 rounded-lg border border-border/60 bg-background/80 p-4 text-left transition",
                      room.id === "house-ops"
                        ? "border-primary/50 bg-primary/5"
                        : "hover:border-primary/40 hover:bg-muted/50"
                    )}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {room.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {room.summary}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                        <span>{room.lastUpdate}</span>
                        {room.unread > 0 ? (
                          <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                            {room.unread} new
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {room.live ? (
                        <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                          <Circle className="size-3 fill-rose-500 text-rose-500" aria-hidden />
                          Live
                        </Badge>
                      ) : null}
                      {room.priority === "high" ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Priority
                        </Badge>
                      ) : null}
                      <span>{room.watchers} participants</span>
                      {room.typing ? <span>{room.typing}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle>House ops war room</CardTitle>
                <CardDescription>
                  Leak escalation workspace with realtime updates, tasks, and
                  attachments.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline">
                  <Video className="mr-2 size-4" aria-hidden />
                  Start call
                </Button>
                <Button size="sm" variant="outline">
                  <Phone className="mr-2 size-4" aria-hidden />
                  Ping onsite
                </Button>
                <Button size="sm">
                  <Broadcast className="mr-2 size-4" aria-hidden />
                  Record update
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Circle className="size-3 fill-emerald-500 text-emerald-500" aria-hidden />
                Stable connection
              </Badge>
              <span>6 participants watching • Typing indicators on</span>
              <span>Synced to maintenance ticket #482</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[420px] rounded-md border border-dashed border-border/60 bg-muted/20 p-4">
              <div className="space-y-6">
                {messageTranscript.map((message) => {
                  if (message.type === "system") {
                    return (
                      <div key={message.id} className="space-y-2 text-center text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 font-medium text-foreground">
                          <Clock className="size-3" aria-hidden />
                          {message.timestamp}
                        </div>
                        {message.content.map((line, index) => (
                          <p key={`${message.id}-${index}`} className="mx-auto max-w-xl text-[13px]">
                            {line}
                          </p>
                        ))}
                      </div>
                    )
                  }

                  return (
                    <div key={message.id} className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className={cn("text-sm font-medium", message.accent)}>
                            {message.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {message.author}
                            </p>
                            <Badge variant="outline">{message.role}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                            {message.content?.map((paragraph, index) => (
                              <p key={`${message.id}-content-${index}`}>{paragraph}</p>
                            ))}
                          </div>

                          {message.attachments?.length ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Attachments
                              </p>
                              <div className="space-y-2">
                                {message.attachments.map((attachment, index) => (
                                  <div
                                    key={`${message.id}-attachment-${index}`}
                                    className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-background px-3 py-2"
                                  >
                                    <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                                    <div className="flex flex-1 flex-col">
                                      <span className="text-sm font-medium text-foreground">
                                        {attachment.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {attachment.description}
                                      </span>
                                    </div>
                                    <Badge variant="outline">Download</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {message.reactions?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {message.reactions.map((reaction) => (
                                <Button
                                  key={`${message.id}-${reaction.emoji}`}
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 rounded-full border-dashed bg-background/60 px-3 text-xs",
                                    reaction.active && "border-primary text-primary"
                                  )}
                                >
                                  <span className="mr-1 text-base" aria-hidden>
                                    {reaction.emoji}
                                  </span>
                                  {reaction.count}
                                </Button>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                              >
                                + Add reaction
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="space-y-3 rounded-lg border border-border/70 bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Connected as Maya · Last synced 12s ago</span>
                <span>Latency 82 ms</span>
              </div>
              <Textarea
                placeholder="Draft a live update for the household…"
                rows={3}
                className="resize-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-9">
                    <Paperclip className="size-4" aria-hidden />
                    <span className="sr-only">Attach file</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9">
                    <Smile className="size-4" aria-hidden />
                    <span className="sr-only">Add emoji</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9">
                    <Mic className="size-4" aria-hidden />
                    <span className="sr-only">Record voice note</span>
                  </Button>
                </div>
                <Button>
                  Send update
                  <Send className="ml-2 size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel health</CardTitle>
              <CardDescription>
                Realtime diagnostics for the active room.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-emerald-50/80 p-3 text-xs">
                <Wifi className="mt-0.5 size-4 text-emerald-600" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-700">Connected</p>
                  <p className="text-muted-foreground">
                    Supabase realtime stream stable · last handshake 12s ago.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-sky-50/80 p-3 text-xs">
                <Broadcast className="mt-0.5 size-4 text-sky-600" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold text-sky-700">Recording enabled</p>
                  <p className="text-muted-foreground">
                    Posts mirrored to household timeline for roommates not in the room.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-amber-50/80 p-3 text-xs">
                <Activity className="mt-0.5 size-4 text-amber-600" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-700">Automation queue</p>
                  <p className="text-muted-foreground">
                    Cal.com holds laundry hallway · Stripe reimbursements queued after invoice upload.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live presence</CardTitle>
              <CardDescription>
                Roommates currently synced to this channel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {presence.map((person) => (
                <div
                  key={person.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex size-2.5 items-center justify-center rounded-full",
                        presenceStatusStyles[person.status]
                      )}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {person.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{person.role}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{person.focus}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action queue</CardTitle>
              <CardDescription>
                Tasks generated from the live session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionQueue.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-border/60 bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
                        actionQueueBadgeStyles[item.priority]
                      )}
                    >
                      {item.due}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pinned resources</CardTitle>
              <CardDescription>
                Quick references surfaced for the live room.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pinnedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3"
                >
                  <Pin className="size-4 text-muted-foreground" aria-hidden />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {resource.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{resource.meta}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {resource.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live timeline</CardTitle>
              <CardDescription>
                Snapshot of recent automation and decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveActivity.map((event) => {
                  const Icon = activityIconStyles[event.type].icon
                  const tone = activityIconStyles[event.type].tone

                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <Icon className={cn("size-4", tone)} aria-hidden />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{event.actor}</span>
                          <span>•</span>
                          <span>{event.time}</span>
                        </div>
                        <p className="text-sm text-foreground">{event.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
