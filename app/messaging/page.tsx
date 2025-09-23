import ModerationControls from "@/components/messaging/moderation-controls"
import { ThreadPostsRefresh } from "@/components/messaging/thread-posts-refresh"
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
import { Progress } from "@/components/ui/progress"

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Paperclip } from "lucide-react"

type ThreadListItem = {
  id: string
  title: string
  category: string
  summary: string
  lastMessageAt: string
  unreadCount: number
  participants: number
  attachments: number
  activity: string
  reactions: string[]
  pinned?: boolean
}

type Attachment = {
  id: string
  label: string
  description: string
  type: string
}

type PollOption = {
  label: string
  votes: number
}

type ThreadPoll = {
  question: string
  closesAt: string
  totalVotes: number
  options: PollOption[]
}

type PostReaction = {
  emoji: string
  count: number
  active?: boolean
}

type ThreadPost = {
  id: string
  author: {
    name: string
    role: string
    initials: string
    accent: string
  }
  timestamp: string
  content: string[]
  attachments?: Attachment[]
  poll?: ThreadPoll
  reactions?: PostReaction[]
}

type AttachmentSummary = {
  id: string
  title: string
  thread: string
  updatedBy: string
  type: string
}

type PollSnapshot = {
  id: string
  title: string
  thread: string
  closesAt: string
  leadingOption: string
  votes: number
  progress: number
}

const threadFilters = [
  { label: "All topics", active: true },
  { label: "Chores", active: false },
  { label: "Logistics", active: false },
  { label: "Maintenance", active: false },
  { label: "Social", active: false },
]

const threadList: ThreadListItem[] = [
  {
    id: "chore-rotation",
    title: "Q2 chore rotation plan",
    category: "Chores",
    summary:
      "Maya shared the deep clean poll and refreshed the rotation checklist for April through June.",
    lastMessageAt: "8 minutes ago",
    unreadCount: 3,
    participants: 5,
    attachments: 3,
    activity: "Poll closes Friday",
    reactions: ["🧽", "📊"],
    pinned: true,
  },
  {
    id: "wifi-upgrade",
    title: "Wi-Fi upgrade appointment",
    category: "Maintenance",
    summary: "Installer confirmed for Tuesday 3 PM — need a roommate at home for access.",
    lastMessageAt: "1 hour ago",
    unreadCount: 0,
    participants: 4,
    attachments: 1,
    activity: "Awaiting volunteer",
    reactions: ["📡"],
  },
  {
    id: "grocery-coop",
    title: "June grocery co-op",
    category: "Logistics",
    summary: "Poll launched for bulk Costco run and shared pantry restock wishlist.",
    lastMessageAt: "3 hours ago",
    unreadCount: 1,
    participants: 6,
    attachments: 2,
    activity: "Poll 65% complete",
    reactions: ["🛒", "👍"],
  },
  {
    id: "guest-policy",
    title: "Guest visit guidelines",
    category: "House rules",
    summary: "Property manager posted updated visitor limits and overnight request process.",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
    participants: 5,
    attachments: 2,
    activity: "Decision logged",
    reactions: ["✅"],
  },
]

const activeThread = {
  title: "Q2 chore rotation plan",
  summary:
    "Keep the shared areas sparkling with a rotation everyone can reference — vote on the deep clean weekend and review updated checklists in one place.",
  category: "Chores",
  owner: "Maya Patel",
  participants: 5,
  updated: "8 minutes ago",
}

const threadPosts: ThreadPost[] = [
  {
    id: "maya-intro",
    author: {
      name: "Maya Patel",
      role: "Host roommate",
      initials: "MP",
      accent: "bg-sky-500/20 text-sky-700",
    },
    timestamp: "Today • 8:45 AM",
    content: [
      "Kicking off the Q2 chore rotation thread so we can stay ahead of the spring deep clean.",
      "Please vote in the poll for when we should tackle the deep clean together. I added the updated checklist and rotation calendar so everyone can review before voting.",
    ],
    attachments: [
      {
        id: "checklist",
        label: "Deep clean checklist.pdf",
        description: "Property manager template · 320 KB",
        type: "Document",
      },
      {
        id: "calendar",
        label: "Q2 rotation.xlsx",
        description: "Draft assignments by week · 120 KB",
        type: "Spreadsheet",
      },
    ],
    poll: {
      question: "When should we schedule the deep clean weekend?",
      closesAt: "Friday 6:00 PM",
      totalVotes: 9,
      options: [
        { label: "Saturday 10:00 AM", votes: 4 },
        { label: "Saturday 2:00 PM", votes: 3 },
        { label: "Sunday 11:00 AM", votes: 2 },
      ],
    },
    reactions: [
      { emoji: "👍", count: 4, active: true },
      { emoji: "🧽", count: 3 },
      { emoji: "✨", count: 2 },
    ],
  },
  {
    id: "jordan-feedback",
    author: {
      name: "Jordan Lee",
      role: "Roommate",
      initials: "JL",
      accent: "bg-amber-500/20 text-amber-700",
    },
    timestamp: "Today • 9:05 AM",
    content: [
      "Looks good to me. I left a couple of notes in the sheet about trading weekends because of my travel schedule.",
      "If we go with the Saturday 10 AM block, I can take recycling duty during the week so Sunday stays open.",
    ],
    attachments: [
      {
        id: "notes",
        label: "Rotation comments.xlsx",
        description: "Suggested swaps highlighted in yellow",
        type: "Spreadsheet",
      },
    ],
    reactions: [
      { emoji: "✅", count: 3 },
      { emoji: "🙌", count: 1 },
    ],
  },
  {
    id: "avery-wrap-up",
    author: {
      name: "Avery Chen",
      role: "Property manager",
      initials: "AC",
      accent: "bg-purple-500/20 text-purple-700",
    },
    timestamp: "Today • 9:42 AM",
    content: [
      "Thanks everyone! Once the poll closes I'll lock the rotation and post a PDF to the documents hub.",
      "Reminder that the spring inspection is on April 18 — make sure kitchen counters and the entryway are cleared the night before.",
    ],
    reactions: [
      { emoji: "📌", count: 2 },
      { emoji: "👏", count: 2 },
    ],
  },
]

const attachmentSummary: AttachmentSummary[] = [
  {
    id: "rotation",
    title: "Q2 rotation.xlsx",
    thread: "Q2 chore rotation plan",
    updatedBy: "Maya • 8:45 AM",
    type: "Spreadsheet",
  },
  {
    id: "inspection",
    title: "Spring inspection guide.pdf",
    thread: "Guest visit guidelines",
    updatedBy: "Avery • Yesterday",
    type: "Document",
  },
  {
    id: "grocery-list",
    title: "Bulk grocery wishlist.csv",
    thread: "June grocery co-op",
    updatedBy: "Jordan • Monday",
    type: "Spreadsheet",
  },
]

const pollSnapshots: PollSnapshot[] = [
  {
    id: "deep-clean",
    title: "Deep clean weekend",
    thread: "Q2 chore rotation plan",
    closesAt: "Closes Friday",
    leadingOption: "Saturday 10:00 AM",
    votes: 9,
    progress: 68,
  },
  {
    id: "grocery-run",
    title: "Costco run timing",
    thread: "June grocery co-op",
    closesAt: "Closes in 2 days",
    leadingOption: "Sunday afternoon",
    votes: 12,
    progress: 54,
  },
  {
    id: "wifi-coverage",
    title: "Who can host installer?",
    thread: "Wi-Fi upgrade appointment",
    closesAt: "Closes tonight",
    leadingOption: "Jordan",
    votes: 4,
    progress: 75,
  },
]

export default function MessagingPage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Messaging</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Organize roommate discussions by topic, capture reactions, and close the loop on decisions with polls and shared attachments.
          </p>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[320px,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Threaded conversations</CardTitle>
                  <CardDescription>
                    Keep every roommate topic in its own thread so updates, reactions, and attachments stay in context.
                  </CardDescription>
                </div>
                <Button size="sm">New thread</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {threadFilters.map((filter) => (
                  <span
                    key={filter.label}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                      filter.active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground"
                    )}
                  >
                    {filter.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {threadList.map((thread) => (
                <div
                  key={thread.id}
                  className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 transition hover:border-primary/50 hover:bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{thread.category}</Badge>
                        {thread.pinned ? (
                          <Badge variant="outline" className="uppercase">
                            Pinned
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{thread.title}</p>
                      <p className="text-xs text-muted-foreground">{thread.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span className="text-muted-foreground">{thread.lastMessageAt}</span>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                      <div className="flex gap-1">
                        {thread.reactions.map((reaction) => (
                          <span
                            key={`${thread.id}-${reaction}`}
                            className="inline-flex size-6 items-center justify-center rounded-full bg-background text-sm"
                            aria-hidden
                          >
                            {reaction}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{thread.participants} participants</span>
                    <span>{thread.attachments} attachments</span>
                    <span>{thread.activity}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polls & alignment</CardTitle>
              <CardDescription>
                Track decisions across threads so chores, logistics, and maintenance stay in sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {pollSnapshots.map((poll) => (
                  <div
                    key={poll.id}
                    className="space-y-3 rounded-lg border border-border/60 bg-background/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{poll.title}</p>
                        <p className="text-xs text-muted-foreground">{poll.thread}</p>
                      </div>
                      <Badge variant="secondary">{poll.closesAt}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>{poll.leadingOption}</span>
                        <span>{poll.votes} votes</span>
                      </div>
                      <Progress value={poll.progress} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>{activeThread.title}</CardTitle>
                  <CardDescription>{activeThread.summary}</CardDescription>
                </div>
                <Badge variant="secondary">{activeThread.category}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Owner: {activeThread.owner}</span>
                <span>{activeThread.participants} roommates involved</span>
                <span>Updated {activeThread.updated}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ThreadPostsRefresh>
                {threadPosts.map((post, index) => (
                  <div key={post.id} className="space-y-4">
                    <article className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className={cn("text-sm font-medium", post.author.accent)}>
                            {post.author.initials}
                          </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{post.author.name}</span>
                          <Badge variant="outline">{post.author.role}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm leading-6 text-foreground">
                      {post.content.map((paragraph, idx) => (
                        <p key={`${post.id}-content-${idx}`} className="text-muted-foreground">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {post.attachments?.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Attachments
                        </p>
                        <div className="space-y-2">
                          {post.attachments.map((attachment) => (
                            <div
                              key={`${post.id}-${attachment.id}`}
                              className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2"
                            >
                              <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                              <div className="flex flex-1 flex-col">
                                <span className="text-sm font-medium text-foreground">{attachment.label}</span>
                                <span className="text-xs text-muted-foreground">{attachment.description}</span>
                              </div>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {attachment.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {post.poll ? (
                      <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{post.poll.question}</p>
                            <p className="text-xs text-muted-foreground">Vote once to lock in the weekend.</p>
                          </div>
                          <Badge variant="secondary">Closes {post.poll.closesAt}</Badge>
                        </div>
                        <div className="space-y-3">
                          {post.poll.options.map((option) => {
                            const percent =
                              post.poll && post.poll.totalVotes > 0
                                ? Math.round((option.votes / post.poll.totalVotes) * 100)
                                : 0

                            return (
                              <div key={`${post.id}-${option.label}`} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                  <span>{option.label}</span>
                                  <span>
                                    {option.votes} vote{option.votes === 1 ? "" : "s"} · {percent}%
                                  </span>
                                </div>
                                <Progress value={percent} />
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {post.poll.totalVotes} roommate votes collected so far
                        </p>
                      </div>
                    ) : null}

                    {post.reactions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {post.reactions.map((reaction) => (
                          <Button
                            key={`${post.id}-${reaction.emoji}`}
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
                    </article>
                    {index < threadPosts.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </ThreadPostsRefresh>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared attachments</CardTitle>
              <CardDescription>
                Surface the latest files pinned across threads so everyone can reference the source of truth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachmentSummary.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                >
                  <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{attachment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.thread} • {attachment.updatedBy}
                    </p>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {attachment.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <ModerationControls />
    </div>
  )
}
