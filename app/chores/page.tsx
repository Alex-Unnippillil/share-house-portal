'use client'

import { useMemo, useState } from 'react'
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  ListChecks,
  PlusCircle,
  RefreshCcw,
  Sparkles,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type ChoreStatus = 'on-track' | 'due-soon' | 'overdue'

interface WeeklyChore {
  id: string
  title: string
  roommateId: string
  roommate: string
  due: string
  day: string
  status: ChoreStatus
  area: string
  notes: string
  effort: string
  isToday?: boolean
  defaultComplete?: boolean
}

interface RoommateStat {
  id: string
  name: string
  initials: string
  role: string
  completed: number
  total: number
  streak: number
  upcoming: string
}

interface RotationItem {
  id: string
  title: string
  next: string
  window: string
  frequency: string
  focus: string
}

interface PlannerDay {
  id: string
  dateLabel: string
  events: {
    id: string
    time: string
    title: string
    owner: string
    note: string
    support: string
  }[]
}

interface CompletionEntry {
  id: string
  title: string
  roommate: string
  initials: string
  completedAt: string
  note: string
  score: string
}

const weeklyChores: WeeklyChore[] = [
  {
    id: 'task-1',
    title: 'Kitchen reset & countertops',
    roommateId: 'alex',
    roommate: 'Alex Johnson',
    due: 'Mon • 6:00 PM',
    day: 'Monday',
    status: 'on-track',
    area: 'Kitchen',
    notes: 'Run the dishwasher, wipe high-touch surfaces, and refresh the hand towels.',
    effort: '30 min',
    defaultComplete: true,
  },
  {
    id: 'task-2',
    title: 'Trash & recycling drop-off',
    roommateId: 'priya',
    roommate: 'Priya Patel',
    due: 'Tue • 7:00 AM',
    day: 'Tuesday',
    status: 'due-soon',
    area: 'Utility',
    notes: 'Roll bins to the curb, confirm compost bag is under 3/4 full, and reset liners.',
    effort: '15 min',
    isToday: true,
  },
  {
    id: 'task-3',
    title: 'Bathroom deep clean',
    roommateId: 'jamie',
    roommate: 'Jamie Lee',
    due: 'Thu • 7:30 PM',
    day: 'Thursday',
    status: 'due-soon',
    area: 'Bath',
    notes: 'Scrub tile grout, swap out bath mats, and restock toiletries basket.',
    effort: '45 min',
  },
  {
    id: 'task-4',
    title: 'Shared fridge audit',
    roommateId: 'maria',
    roommate: 'María González',
    due: 'Fri • 5:30 PM',
    day: 'Friday',
    status: 'on-track',
    area: 'Kitchen',
    notes: 'Label leftovers, clear expired items, and sanitize shelves.',
    effort: '25 min',
    defaultComplete: true,
  },
  {
    id: 'task-5',
    title: 'Living room tidy reset',
    roommateId: 'alex',
    roommate: 'Alex Johnson',
    due: 'Sat • 11:00 AM',
    day: 'Saturday',
    status: 'on-track',
    area: 'Commons',
    notes: 'Dust media console, fold blankets, water plants, and vacuum entry runner.',
    effort: '35 min',
  },
  {
    id: 'task-6',
    title: 'Grocery staples run',
    roommateId: 'priya',
    roommate: 'Priya Patel',
    due: 'Sun • 4:00 PM',
    day: 'Sunday',
    status: 'overdue',
    area: 'Pantry',
    notes: 'Replenish shared essentials (oat milk, paper towels, dishwasher tabs). Upload receipt.',
    effort: '40 min',
  },
]

const rotationQueue: RotationItem[] = [
  {
    id: 'rotation-1',
    title: 'Bathroom deep clean',
    next: 'Jamie Lee',
    window: 'Thu • 7:30 PM',
    frequency: 'Bi-weekly',
    focus: 'Tile grout scrub + mirror polish. Set a 15 min timer per zone.',
  },
  {
    id: 'rotation-2',
    title: 'Oven + stovetop detail',
    next: 'María González',
    window: 'Sat • 2:00 PM',
    frequency: 'Monthly',
    focus: 'Run self-clean cycle, degrease backsplash, and empty crumb trays.',
  },
  {
    id: 'rotation-3',
    title: 'Supply inventory check',
    next: 'Priya Patel',
    window: 'Sun • 5:30 PM',
    frequency: 'Monthly',
    focus: 'Count paper goods, dish soap, and cleaning sprays. Update shared list.',
  },
  {
    id: 'rotation-4',
    title: 'Balcony refresh',
    next: 'Alex Johnson',
    window: 'Wed • 6:15 PM',
    frequency: 'Monthly',
    focus: 'Sweep deck, water herb planters, and wipe down furniture surfaces.',
  },
]

const roommateStats: RoommateStat[] = [
  {
    id: 'alex',
    name: 'Alex Johnson',
    initials: 'AJ',
    role: 'Kitchen lead',
    completed: 6,
    total: 7,
    streak: 5,
    upcoming: 'Pantry inventory • Fri 5:30 PM',
  },
  {
    id: 'priya',
    name: 'Priya Patel',
    initials: 'PP',
    role: 'Sustainability captain',
    completed: 5,
    total: 7,
    streak: 3,
    upcoming: 'Compost drop-off • Tue 7:00 AM',
  },
  {
    id: 'jamie',
    name: 'Jamie Lee',
    initials: 'JL',
    role: 'Wellness coordinator',
    completed: 4,
    total: 6,
    streak: 4,
    upcoming: 'Deep clean rotation • Thu 7:30 PM',
  },
  {
    id: 'maria',
    name: 'María González',
    initials: 'MG',
    role: 'Community liaison',
    completed: 7,
    total: 8,
    streak: 6,
    upcoming: 'Oven detail • Sat 2:00 PM',
  },
]

const plannerEvents: PlannerDay[] = [
  {
    id: 'planner-1',
    dateLabel: 'Monday • Apr 8',
    events: [
      {
        id: 'event-1',
        time: '6:00 PM',
        title: 'Kitchen reset & countertops',
        owner: 'Alex Johnson',
        note: 'Confirm dishwasher cycle is complete before wiping stainless steel.',
        support: 'Loop in Priya for compost bin refresh.',
      },
    ],
  },
  {
    id: 'planner-2',
    dateLabel: 'Tuesday • Apr 9',
    events: [
      {
        id: 'event-2',
        time: '7:00 AM',
        title: 'Trash & recycling drop-off',
        owner: 'Priya Patel',
        note: 'Bins must be curbside by 7:15 AM. Snap a quick photo confirmation.',
        support: 'Jamie to double-check hallway cleared the night prior.',
      },
      {
        id: 'event-3',
        time: '8:30 PM',
        title: 'Laundry appliances wipe-down',
        owner: 'Jamie Lee',
        note: 'Run empty vinegar cycle and clean lint traps.',
        support: 'Alex will restock dryer sheets afterward.',
      },
    ],
  },
  {
    id: 'planner-3',
    dateLabel: 'Thursday • Apr 11',
    events: [
      {
        id: 'event-4',
        time: '7:30 PM',
        title: 'Bathroom deep clean',
        owner: 'Jamie Lee',
        note: 'Rotate cleaning zones every 15 minutes to stay on track.',
        support: 'María to deliver fresh linens at 8:00 PM.',
      },
    ],
  },
  {
    id: 'planner-4',
    dateLabel: 'Saturday • Apr 13',
    events: [
      {
        id: 'event-5',
        time: '11:00 AM',
        title: 'Living room tidy reset',
        owner: 'Alex Johnson',
        note: 'Coordinate playlist + open windows for a 20 minute airing out.',
        support: 'Priya to handle recycling while Alex vacuums.',
      },
      {
        id: 'event-6',
        time: '2:00 PM',
        title: 'Oven + stovetop detail',
        owner: 'María González',
        note: 'Self-clean cycle scheduled, manual scrub for tough spots.',
        support: 'Jamie stands by for safety check and counter reset.',
      },
    ],
  },
]

const completionHistory: CompletionEntry[] = [
  {
    id: 'history-1',
    title: 'Living room tidy reset',
    roommate: 'Alex Johnson',
    initials: 'AJ',
    completedAt: 'Sat, Apr 6 • 11:20 AM',
    note: 'Left a quick walkthrough video in the chat for review.',
    score: '98%',
  },
  {
    id: 'history-2',
    title: 'Recycling drop-off',
    roommate: 'Priya Patel',
    initials: 'PP',
    completedAt: 'Sun, Apr 7 • 9:30 AM',
    note: 'Added compost run to the shared expense tracker.',
    score: '100%',
  },
  {
    id: 'history-3',
    title: 'Bathroom deep clean',
    roommate: 'Jamie Lee',
    initials: 'JL',
    completedAt: 'Thu, Mar 28 • 8:10 PM',
    note: 'Swapped in the aromatherapy diffuser per team request.',
    score: '95%',
  },
  {
    id: 'history-4',
    title: 'Pantry organization',
    roommate: 'María González',
    initials: 'MG',
    completedAt: 'Fri, Mar 29 • 6:45 PM',
    note: 'Uploaded labeled shelf diagram for quick access later.',
    score: '99%',
  },
]

const statusStyles: Record<ChoreStatus, string> = {
  'on-track':
    'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  'due-soon':
    'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  overdue:
    'border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
}

const statusCopy: Record<ChoreStatus, string> = {
  'on-track': 'On track',
  'due-soon': 'Due soon',
  overdue: 'Overdue',
}

const initialCompletedChoreIds = weeklyChores
  .filter((chore) => chore.defaultComplete)
  .map((chore) => chore.id)

export default function ChoresPage() {
  const [completedChores, setCompletedChores] = useState<Set<string>>(
    () => new Set(initialCompletedChoreIds)
  )
  const [focusRoommate, setFocusRoommate] = useState<string | null>(null)

  const completionRate = useMemo(() => {
    if (weeklyChores.length === 0) return 0
    return Math.round((completedChores.size / weeklyChores.length) * 100)
  }, [completedChores])

  const openChores = weeklyChores.length - completedChores.size
  const todaysChores = useMemo(
    () =>
      weeklyChores.filter(
        (chore) => chore.isToday && !completedChores.has(chore.id)
      ).length,
    [completedChores]
  )

  const focusRoommateData = focusRoommate
    ? roommateStats.find((roommate) => roommate.id === focusRoommate)
    : undefined

  const toggleChore = (choreId: string, checked: boolean) => {
    setCompletedChores((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(choreId)
      } else {
        next.delete(choreId)
      }
      return next
    })
  }

  const stats = useMemo(
    () => {
      const nextRotation = rotationQueue[0]
      return [
        {
          label: 'Completion rate',
          value: `${completionRate}%`,
          helper: `${completedChores.size} of ${weeklyChores.length} tasks locked in`,
          icon: CheckCircle2,
          accent: 'text-emerald-500 dark:text-emerald-300',
        },
        {
          label: 'Open chores',
          value: `${openChores}`,
          helper:
            todaysChores > 0
              ? `${todaysChores} due today`
              : 'No outstanding items today',
          icon: CalendarClock,
          accent: 'text-sky-500 dark:text-sky-300',
        },
        {
          label: 'Next rotation',
          value: nextRotation?.title ?? 'All rotations assigned',
          helper: nextRotation
            ? `${nextRotation.next} • ${nextRotation.window}`
            : 'Set the next rotation to keep things moving',
          icon: RefreshCcw,
          accent: 'text-violet-500 dark:text-violet-300',
        },
      ]
    },
    [completionRate, completedChores.size, openChores, todaysChores]
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Badge
            variant="outline"
            className="w-fit gap-1 rounded-full border-dashed px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <ListChecks className="size-3.5" /> Household operations
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Chore management</h1>
            <p className="text-muted-foreground">
              Delegate, track, and celebrate weekly responsibilities across the home.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCcw className="size-4" /> Rebalance week
          </Button>
          <Button size="sm" className="gap-2">
            <PlusCircle className="size-4" /> New chore
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className="text-2xl font-semibold tracking-tight">
                    {stat.value}
                  </div>
                </div>
                <Icon className={cn('size-6', stat.accent)} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{stat.helper}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="overview" className="gap-2">
              <CheckCircle2 className="size-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="planner" className="gap-2">
              <CalendarDays className="size-4" /> Planner
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Sparkles className="size-4" /> History
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarCheck className="size-4" /> Sync calendar
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Download className="size-4" /> Export log
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card className="shadow-sm">
              <CardHeader className="space-y-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>This week&apos;s rotation</CardTitle>
                    <CardDescription>
                      Tick off tasks as soon as they&apos;re complete.
                      {focusRoommateData ? (
                        <span className="ml-1 text-foreground">
                          Focused on {focusRoommateData.name}.
                        </span>
                      ) : (
                        <span className="ml-1 text-muted-foreground">
                          Everyone shares the same priority view.
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="h-fit rounded-full px-3 py-1 text-xs">
                    Updated moments ago
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] pr-2">
                  <div className="space-y-3">
                    {weeklyChores.map((chore) => {
                      const checked = completedChores.has(chore.id)
                      return (
                        <div
                          key={chore.id}
                          className={cn(
                            'grid grid-cols-[auto,1fr] items-start gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 transition hover:border-primary/50 hover:bg-primary/5 sm:grid-cols-[auto,1fr,auto]',
                            focusRoommate && focusRoommate !== chore.roommateId &&
                              'opacity-50 grayscale'
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleChore(chore.id, value === true)
                            }
                            className="mt-1"
                            aria-label={`Mark ${chore.title} as complete`}
                          />
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium leading-none">{chore.title}</p>
                              <Badge
                                variant="outline"
                                className="border-dashed bg-background/80 text-[10px] uppercase tracking-wide text-muted-foreground"
                              >
                                {chore.area}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{chore.notes}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3.5" /> {chore.effort}
                              </span>
                              <span>
                                Owner:{' '}
                                <span className="font-medium text-foreground">
                                  {chore.roommate}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between gap-2 text-right">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {chore.due}
                              </p>
                              <p className="text-xs capitalize text-muted-foreground">
                                {chore.day}
                              </p>
                            </div>
                            <Badge className={statusStyles[chore.status]}>
                              {statusCopy[chore.status]}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-xs"
                            >
                              <CalendarCheck className="size-4" /> Reschedule
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Roommate scoreboard</CardTitle>
                  <CardDescription>
                    Monitor completion streaks and upcoming focus areas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roommateStats.map((roommate) => {
                    const completionPercent = Math.round(
                      (roommate.completed / roommate.total) * 100
                    )
                    const isFocused = focusRoommate === roommate.id
                    return (
                      <div
                        key={roommate.id}
                        className="rounded-xl border border-border/60 bg-muted/20 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{roommate.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium leading-none">
                                {roommate.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {roommate.role}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="border-none bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">
                              <Flame className="mr-1 size-3.5" />
                              {roommate.streak}-day streak
                            </Badge>
                            <Button
                              variant={isFocused ? 'default' : 'outline'}
                              size="sm"
                              className="gap-2"
                              onClick={() =>
                                setFocusRoommate((prev) =>
                                  prev === roommate.id ? null : roommate.id
                                )
                              }
                            >
                              <ListChecks className="size-4" />
                              {isFocused ? 'Focused' : 'Focus'}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {roommate.completed} of {roommate.total} complete
                            </span>
                            <span>{completionPercent}%</span>
                          </div>
                          <Progress value={completionPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            Next up:{' '}
                            <span className="font-medium text-foreground">
                              {roommate.upcoming}
                            </span>
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Rotation queue</CardTitle>
                  <CardDescription>
                    Upcoming deep cleans and shared maintenance assignments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[220px] pr-2">
                    <div className="space-y-3">
                      {rotationQueue.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium leading-none">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.frequency}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="w-fit rounded-full px-3 py-1 text-[11px]"
                            >
                              {index === 0 ? 'Up next' : 'Queued'}
                            </Badge>
                          </div>
                          <Separator className="my-3" />
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground">
                                {item.next}
                              </span>
                              <span>{item.window}</span>
                            </div>
                            <p>{item.focus}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <CalendarClock className="size-4" /> View schedule
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="planner">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Interactive planner</CardTitle>
              <CardDescription>
                Preview the rotation, align on ownership, and spot support needs for the
                week ahead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-3">
                <div className="space-y-6">
                  {plannerEvents.map((day) => (
                    <div key={day.id} className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarDays className="size-4" />
                        <span>{day.dateLabel}</span>
                      </div>
                      <div className="space-y-3">
                        {day.events.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {event.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {event.note}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {event.time}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <Badge className="border-none bg-primary/10 text-primary">
                                {event.owner}
                              </Badge>
                              <span>{event.support}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Need to rebalance? Drag & drop scheduling is coming soon—use quick actions
                above for now.
              </p>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarCheck className="size-4" /> Sync to calendar
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Completion history</CardTitle>
              <CardDescription>
                Quality notes from the past few rotations keep everyone aligned on the
                standard of care.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-3">
                <div className="space-y-4">
                  {completionHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {entry.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.completedAt}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          QA score {entry.score}
                        </Badge>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{entry.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none text-foreground">
                              {entry.roommate}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.note}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Sparkles className="size-4" /> Celebrate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="size-4" /> Export as CSV
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
