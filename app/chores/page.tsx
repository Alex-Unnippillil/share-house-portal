import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ListChecks,
  MessageSquare,
  Repeat,
  ShieldCheck,
  Sparkles,
  Swap,
  Target,
  type LucideIcon,
} from "lucide-react"

type ChoreStatus = "due_today" | "overdue" | "scheduled" | "completed"

const statusConfig: Record<ChoreStatus, { label: string; badgeClassName: string }> = {
  due_today: {
    label: "Due today",
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  overdue: {
    label: "Overdue",
    badgeClassName:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200",
  },
  scheduled: {
    label: "Scheduled",
    badgeClassName:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
  },
  completed: {
    label: "Completed",
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
}

type Assignee = {
  name: string
  initials: string
  avatar: string
}

type ActiveChore = {
  id: string
  title: string
  assignee: Assignee
  due: string
  status: ChoreStatus
  cadence: string
  points: number
  description: string
  lastCompleted: string
  automationNote: string
  thread: string
}

const activeChores: ActiveChore[] = [
  {
    id: "kitchen-reset",
    title: "Kitchen reset & counter sanitizing",
    assignee: { name: "Avery Chen", initials: "AC", avatar: "/avatars/02.png" },
    due: "Wed • Jul 24 at 7:00 PM",
    status: "due_today",
    cadence: "Weekly on Wednesdays",
    points: 40,
    description:
      "Wipe down appliances, empty the sink, run the dishwasher, and upload before/after photos to the shared thread.",
    lastCompleted: "Jordan Miles — Jul 17",
    automationNote: "Auto-reminder scheduled for 5:00 PM if completion isn't logged.",
    thread: "Rotation thread: Q2 chore rotation plan",
  },
  {
    id: "fridge-purge",
    title: "Fridge purge & inventory",
    assignee: { name: "Malik Okoro", initials: "MO", avatar: "/avatars/04.png" },
    due: "Mon • Jul 22 at 9:00 PM",
    status: "overdue",
    cadence: "Biweekly on Mondays",
    points: 30,
    description: "Discard expired items, wipe shelves, and log an updated inventory snapshot.",
    lastCompleted: "Priya Singh — Jul 08",
    automationNote: "Escalates to the rotation thread tonight if not acknowledged.",
    thread: "Trade requested with Avery for 7/29",
  },
  {
    id: "bathroom-refresh",
    title: "Shared bathroom refresh",
    assignee: { name: "Priya Singh", initials: "PS", avatar: "/avatars/03.png" },
    due: "Sat • Jul 27 at 10:00 AM",
    status: "scheduled",
    cadence: "Weekly on Saturdays",
    points: 35,
    description: "Disinfect sinks & shower, mop floors, and restock essentials.",
    lastCompleted: "Malik Okoro — Jul 20",
    automationNote: "Supplies audit will auto-open if restock is flagged.",
    thread: "Checklist stored in Docs › September chore rotation.pdf",
  },
  {
    id: "trash-recycling",
    title: "Trash, recycling & compost run",
    assignee: { name: "Jordan Miles", initials: "JM", avatar: "/avatars/01.png" },
    due: "Tue • Jul 23 at 8:00 AM",
    status: "completed",
    cadence: "Twice weekly (Tue/Fri)",
    points: 20,
    description: "Take bins to the curb, replace liners, and log overflow issues for the property manager.",
    lastCompleted: "Completed at 7:45 AM with photo proof",
    automationNote: "Verified automatically via hallway camera snapshot.",
    thread: "Synced to maintenance board",
  },
]

type RotationPreview = {
  id: string
  window: string
  focus: string
  anchor: string
  assignments: { label: string; owner: string }[]
  followUp: string
}

const rotationPreview: RotationPreview[] = [
  {
    id: "week-30",
    window: "Week of Jul 29",
    focus: "Deep clean bathrooms & baseboards",
    anchor: "Avery leads supply restock while Jordan covers trash & compost on Monday night.",
    assignments: [
      { label: "Kitchen reset", owner: "Jordan Miles" },
      { label: "Shared bathroom refresh", owner: "Avery Chen" },
      { label: "Trash & recycling", owner: "Malik Okoro" },
    ],
    followUp: "Property manager walk-through scheduled for Thu • Aug 01 at 6:00 PM.",
  },
  {
    id: "week-31",
    window: "Week of Aug 05",
    focus: "Kitchen deep clean & appliance polish",
    anchor: "Priya swaps into the kitchen rotation while Malik handles compost runs during Avery's travel week.",
    assignments: [
      { label: "Kitchen reset", owner: "Priya Singh" },
      { label: "Fridge purge", owner: "Malik Okoro" },
      { label: "Shared bathroom refresh", owner: "Jordan Miles" },
    ],
    followUp: "Reminder: upload appliance photos for inspection archive by Sun • Aug 11.",
  },
  {
    id: "week-32",
    window: "Week of Aug 12",
    focus: "Common areas & dust mitigation",
    anchor: "Household focuses on living room, hallway, and entryway; Avery resumes regular schedule.",
    assignments: [
      { label: "Living room dust & vacuum", owner: "Avery Chen" },
      { label: "Laundry room reset", owner: "Jordan Miles" },
      { label: "Trash & recycling", owner: "Priya Singh" },
    ],
    followUp: "Rotation syncs with Cal.com bookings for weekend guest stays.",
  },
]

type LeaderboardEntry = {
  id: string
  roommate: Assignee
  points: number
  streakWeeks: number
  completionRate: number
  highlight: string
}

const leaderboard: LeaderboardEntry[] = [
  {
    id: "jordan",
    roommate: { name: "Jordan Miles", initials: "JM", avatar: "/avatars/01.png" },
    points: 188,
    streakWeeks: 6,
    completionRate: 92,
    highlight: "Closed out fridge reset early and covered Avery's recycling run last weekend.",
  },
  {
    id: "avery",
    roommate: { name: "Avery Chen", initials: "AC", avatar: "/avatars/02.png" },
    points: 176,
    streakWeeks: 4,
    completionRate: 88,
    highlight: "Coordinated deep clean weekend and kept supply inventory fully documented.",
  },
  {
    id: "priya",
    roommate: { name: "Priya Singh", initials: "PS", avatar: "/avatars/03.png" },
    points: 170,
    streakWeeks: 3,
    completionRate: 86,
    highlight: "Logged photo proof for bathroom refresh and initiated restock tickets automatically.",
  },
  {
    id: "malik",
    roommate: { name: "Malik Okoro", initials: "MO", avatar: "/avatars/04.png" },
    points: 162,
    streakWeeks: 2,
    completionRate: 81,
    highlight: "Picked up an extra compost run while arranging a trade for next week's fridge purge.",
  },
]

type TradeStatus = "awaiting_review" | "approved" | "auto_scheduled"

const tradeStatusConfig: Record<TradeStatus, { label: string; className: string }> = {
  awaiting_review: {
    label: "Awaiting roommate approval",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  approved: {
    label: "Approved & synced",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  auto_scheduled: {
    label: "Auto-scheduled",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
  },
}

type TradeRequest = {
  id: string
  chore: string
  requester: Assignee
  target: string
  status: TradeStatus
  due: string
  reason: string
  followUp: string
}

const tradeRequests: TradeRequest[] = [
  {
    id: "swap-fridge",
    chore: "Fridge purge & inventory",
    requester: { name: "Malik Okoro", initials: "MO", avatar: "/avatars/04.png" },
    target: "Avery Chen",
    status: "awaiting_review",
    due: "Respond before Thu • Jul 25",
    reason: "Hosting family midweek; requesting swap to Sunday rotation.",
    followUp: "Escalates to the property manager if no response by Fri • Jul 26 at 9:00 AM.",
  },
  {
    id: "bathroom-cover",
    chore: "Shared bathroom refresh",
    requester: { name: "Priya Singh", initials: "PS", avatar: "/avatars/03.png" },
    target: "Jordan Miles",
    status: "approved",
    due: "Swap locked for Sat • Jul 27",
    reason: "Jordan covering while Priya travels for work commitments.",
    followUp: "Auto-adjusted points and reminders for both roommates.",
  },
  {
    id: "laundry-skip",
    chore: "Laundry room reset",
    requester: { name: "Avery Chen", initials: "AC", avatar: "/avatars/02.png" },
    target: "Household rotation",
    status: "auto_scheduled",
    due: "Skip approved for Sun • Aug 04",
    reason: "Vacation mode triggered; system reassigned to Malik.",
    followUp: "Catch-up chore queued when Avery returns on Sun • Aug 11.",
  },
]

type QualityStandard = {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

const qualityStandards: QualityStandard[] = [
  {
    id: "proof",
    title: "Photo proof within 2 hours",
    description:
      "Upload before and after photos for kitchen, bathroom, and fridge tasks. Property managers review flagged submissions weekly.",
    icon: CheckCircle2,
  },
  {
    id: "supplies",
    title: "Shared supply monitoring",
    description:
      "Log any supply below 30% in the maintenance board. The system generates restock tickets automatically.",
    icon: ListChecks,
  },
  {
    id: "sync",
    title: "Stay in sync with messaging",
    description:
      "Rotation updates mirror the \"Q2 chore rotation plan\" thread so trades, notes, and approvals stay transparent.",
    icon: MessageSquare,
  },
]

type CompletionRecord = {
  id: string
  chore: string
  completedBy: string
  completedOn: string
  cadence: string
  points: number
  verification: string
}

const completionHistory: CompletionRecord[] = [
  {
    id: "laundry-reset",
    chore: "Laundry room reset",
    completedBy: "Jordan Miles",
    completedOn: "Mon • Jul 22 at 9:10 AM",
    cadence: "Weekly",
    points: 25,
    verification: "Auto-approved via NFC tap on supply cabinet.",
  },
  {
    id: "living-room",
    chore: "Living room dust & vacuum",
    completedBy: "Avery Chen",
    completedOn: "Sun • Jul 21 at 4:20 PM",
    cadence: "Weekly",
    points: 30,
    verification: "Two photos uploaded; roommates acknowledged in thread.",
  },
  {
    id: "plant-care",
    chore: "Shared plant care & watering",
    completedBy: "Priya Singh",
    completedOn: "Sat • Jul 20 at 11:05 AM",
    cadence: "Biweekly",
    points: 18,
    verification: "Follow-up reminder scheduled for Sat • Aug 03.",
  },
  {
    id: "storage-tidy",
    chore: "Storage closet tidy-up",
    completedBy: "Malik Okoro",
    completedOn: "Thu • Jul 18 at 8:45 PM",
    cadence: "Monthly",
    points: 45,
    verification: "Property manager feedback: \"Looks great — keep bins labeled.\"",
  },
]

export default function ChoresPage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-1 bg-primary/10 text-primary hover:bg-primary/10 dark:bg-primary/15 dark:text-primary-foreground"
          >
            <Sparkles className="size-3.5" />
            Automation enabled
          </Badge>
          <Badge
            variant="outline"
            className="gap-1 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200"
          >
            <Repeat className="size-3.5" />
            Rotation resets Mon • 9:00 AM
          </Badge>
          <Badge
            variant="outline"
            className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
          >
            <ShieldCheck className="size-3.5" />
            Proof required for kitchen & bath
          </Badge>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chores</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Coordinate household upkeep with assignments, rotation previews, and accountability insights.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Points and streaks balance the workload across roommates. Trade requests, automation, and proof requirements
          sync directly with the message board so everyone stays aligned.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active household chores</CardTitle>
            <CardDescription>Live assignments with reminders, proof expectations, and escalation rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeChores.map((chore) => {
              const status = statusConfig[chore.status]

              return (
                <div
                  key={chore.id}
                  className="flex flex-col gap-4 rounded-lg border border-muted bg-background/60 p-4 shadow-sm md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex flex-1 gap-4">
                    <Avatar>
                      <AvatarImage alt={chore.assignee.name} src={chore.assignee.avatar} />
                      <AvatarFallback>{chore.assignee.initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold leading-none sm:text-lg">{chore.title}</h3>
                        <Badge variant="outline" className={status.badgeClassName}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{chore.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                        <span className="flex items-center gap-1">
                          <Repeat className="size-4 text-muted-foreground" />
                          {chore.cadence}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-4 text-muted-foreground" />
                          {chore.due}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="size-4 text-muted-foreground" />
                          {chore.points} pts
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                        <span>Last completed: {chore.lastCompleted}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-4 text-muted-foreground" />
                          {chore.thread}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                        <ShieldCheck className="size-4 text-primary" />
                        {chore.automationNote}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground md:items-end">
                    <span className="font-medium text-foreground">{chore.assignee.name}</span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs uppercase tracking-wide">Lead roommate</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rotation preview</CardTitle>
              <CardDescription>Next three rotations pulled from the shared household plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rotationPreview.map((rotation, index) => (
                <div key={rotation.id} className="rounded-lg border border-dashed border-muted p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="size-4" />
                        <span>{rotation.window}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-primary" />
                        <h3 className="text-base font-semibold leading-none">{rotation.focus}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{rotation.anchor}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="gap-1 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200"
                    >
                      <Repeat className="size-3.5" />
                      Rotation {index + 1}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    {rotation.assignments.map((assignment) => (
                      <div
                        key={`${rotation.id}-${assignment.label}`}
                        className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2"
                      >
                        <span className="font-medium text-foreground">{assignment.label}</span>
                        <span>{assignment.owner}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    {rotation.followUp}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Household leaderboard</CardTitle>
              <CardDescription>Points, completion rate, and streaks keep the rotation fair.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-muted p-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage alt={entry.roommate.name} src={entry.roommate.avatar} />
                    <AvatarFallback>{entry.roommate.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium leading-none">{entry.roommate.name}</p>
                      <span className="text-sm font-semibold text-foreground">{entry.points} pts</span>
                    </div>
                    <Progress className="h-2" value={entry.completionRate} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{entry.completionRate}% completion</span>
                      <span>{entry.streakWeeks}-week streak</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.highlight}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Trade requests & adjustments</CardTitle>
            <CardDescription>Coordinate swaps, skips, and coverage with automatic logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tradeRequests.map((request) => {
              const status = tradeStatusConfig[request.status]

              return (
                <div key={request.id} className="rounded-lg border border-muted bg-background/60 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage alt={request.requester.name} src={request.requester.avatar} />
                      <AvatarFallback>{request.requester.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground sm:text-base">{request.chore}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                            <Swap className="size-4 text-muted-foreground" />
                            <span>
                              {request.requester.name} → {request.target}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground sm:text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-muted-foreground" />
                          {request.due}
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-4 text-muted-foreground" />
                          {request.reason}
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <ShieldCheck className="size-4 text-primary" />
                          {request.followUp}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality & accountability checklist</CardTitle>
            <CardDescription>Household standards that keep the rotation audit-ready.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qualityStandards.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-dashed border-muted p-4">
                  <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary dark:bg-primary/20">
                    <Icon className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground sm:text-base">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent completion history</CardTitle>
            <CardDescription>Every submission is logged with cadence, points, and verification details.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-4">
                {completionHistory.map((record) => (
                  <div key={record.id} className="rounded-lg border border-muted bg-background/60 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground sm:text-base">{record.chore}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">{record.completedOn}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/20 text-xs text-muted-foreground sm:text-sm"
                        >
                          {record.cadence}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                        >
                          <CheckCircle2 className="size-3.5" />
                          {record.points} pts
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground sm:text-sm">
                      <p>Completed by {record.completedBy}</p>
                      <p>{record.verification}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
