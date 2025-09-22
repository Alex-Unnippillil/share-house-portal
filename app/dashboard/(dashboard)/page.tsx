import { Metadata } from "next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { differenceInCalendarDays, format } from "date-fns"
import { AlarmClock, Award, CheckCircle2, Flame } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CalendarDateRangePicker } from "@/app/dashboard/components/date-range-picker"
import { MainNav } from "@/app/dashboard/components/main-nav"
import { Overview, type OverviewDatum } from "@/app/dashboard/components/overview"
import { RecentSales, type Reminder } from "@/app/dashboard/components/recent-sales"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

export const metadata: Metadata = {
  title: "Onyx Dashboard",
  description: "Manage your Onyx account and users.",
}

type ChoreAssignment = Database["public"]["Tables"]["chore_assignments"]["Row"]
type StreakRow = Database["public"]["Tables"]["chore_member_streaks"]["Row"]
type SnapshotRow = Database["public"]["Tables"]["chore_streak_snapshots"]["Row"]
type TenantNotification = Database["public"]["Tables"]["tenant_notifications"]["Row"]

function formatDueCopy(diff: number, dueDate: Date) {
  const dateLabel = format(dueDate, "EEE, MMM d")
  if (diff < 0) {
    return `Overdue by ${Math.abs(diff)} days • ${dateLabel}`
  }
  if (diff === 0) {
    return `Due today • ${dateLabel}`
  }
  if (diff === 1) {
    return `Due tomorrow • ${dateLabel}`
  }
  return `Due in ${diff} days • ${dateLabel}`
}

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const [
    { data: streakData, error: streakError },
    { data: assignmentsData, error: assignmentsError },
    { data: notificationsData, error: notificationsError },
    { data: snapshotsData, error: snapshotsError },
  ] = await Promise.all([
    supabase
      .from("chore_member_streaks")
      .select("*")
      .eq("member_id", user.id)
      .maybeSingle(),
    supabase
      .from("chore_assignments")
      .select("id, chore_title, due_date, completed_at, notes")
      .eq("member_id", user.id)
      .order("due_date", { ascending: true }),
    supabase
      .from("tenant_notifications")
      .select(
        "id, member_id, assignment_id, notification_type, title, body, metadata, scheduled_for, delivered_at, created_at"
      )
      .eq("member_id", user.id)
      .order("scheduled_for", { ascending: true })
      .limit(10),
    supabase
      .from("chore_streak_snapshots")
      .select("snapshot_date, current_streak, longest_streak, total_completed, total_assignments")
      .eq("member_id", user.id)
      .order("snapshot_date", { ascending: true })
      .limit(14),
  ])

  if (streakError) {
    console.error("Failed to load streak data", streakError)
  }
  if (assignmentsError) {
    console.error("Failed to load chore assignments", assignmentsError)
  }
  if (notificationsError) {
    console.error("Failed to load notifications", notificationsError)
  }
  if (snapshotsError) {
    console.error("Failed to load streak history", snapshotsError)
  }

  const assignments = (assignmentsData ?? []) as ChoreAssignment[]
  const notifications = (notificationsData ?? []) as TenantNotification[]
  const snapshots = (snapshotsData ?? []) as SnapshotRow[]

  const fallbackStreak: StreakRow = {
    member_id: user.id,
    current_streak: 0,
    longest_streak: 0,
    last_completed_date: null,
    total_completed: assignments.filter((assignment) => assignment.completed_at).length,
    total_assignments: assignments.length,
    updated_at: new Date().toISOString(),
  }

  const streak = (streakData as StreakRow | null) ?? fallbackStreak

  const today = new Date()
  const upcomingAssignments = assignments.filter((assignment) => {
    const dueDate = new Date(assignment.due_date)
    const diff = differenceInCalendarDays(dueDate, today)
    return !assignment.completed_at && diff >= 0
  })
  const dueSoonAssignments = upcomingAssignments.filter((assignment) => {
    const diff = differenceInCalendarDays(new Date(assignment.due_date), today)
    return diff <= 7
  })
  const dueSoonCount = dueSoonAssignments.length
  const dueInTwoDaysAssignments = upcomingAssignments.filter(
    (assignment) => differenceInCalendarDays(new Date(assignment.due_date), today) === 2
  )
  const overdueAssignments = assignments.filter((assignment) => {
    const diff = differenceInCalendarDays(new Date(assignment.due_date), today)
    return !assignment.completed_at && diff < 0
  })
  const overdueCount = overdueAssignments.length

  const upcomingAssignmentItems = dueSoonAssignments.slice(0, 5).map((assignment) => {
    const dueDate = new Date(assignment.due_date)
    const diff = differenceInCalendarDays(dueDate, today)
    return {
      id: assignment.id,
      choreTitle: assignment.chore_title,
      dueCopy: formatDueCopy(diff, dueDate),
      dueIn: diff,
    }
  })

  const chartSource =
    snapshots.length > 0
      ? snapshots.map((snapshot) => ({
          snapshot_date: snapshot.snapshot_date,
          current_streak: snapshot.current_streak,
        }))
      : [
          {
            snapshot_date: today.toISOString(),
            current_streak: streak.current_streak,
          },
        ]

  const streakChartData: OverviewDatum[] = chartSource.map((entry) => ({
    label: format(new Date(entry.snapshot_date), "MMM d"),
    value: entry.current_streak,
  }))

  const completionRate =
    streak.total_assignments === 0
      ? 0
      : Math.round((streak.total_completed / streak.total_assignments) * 100)

  const reminders: Reminder[] = notifications.map((notification) => {
    const metadata = (notification.metadata ?? {}) as Record<string, unknown>
    const dueDateValue = typeof metadata.due_date === "string" ? metadata.due_date : null
    const choreTitleValue =
      typeof metadata.chore_title === "string"
        ? metadata.chore_title
        : assignments.find((assignment) => assignment.id === notification.assignment_id)?.chore_title ?? null

    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      scheduledFor: notification.scheduled_for ?? notification.created_at,
      deliveredAt: notification.delivered_at ?? undefined,
      dueDate: dueDateValue,
      choreTitle: choreTitleValue,
    }
  })

  const lastCompletedLabel = streak.last_completed_date
    ? format(new Date(streak.last_completed_date), "MMM d, yyyy")
    : "No completions yet"
  const analyticsUpdatedLabel = format(new Date(streak.updated_at), "MMM d, yyyy")
  const dueSoonMessage = dueSoonCount
    ? dueInTwoDaysAssignments.length
      ? `${dueInTwoDaysAssignments.length} due in two days`
      : `${dueSoonCount} due within seven days`
    : "No chores due in the next seven days"
  const upcomingCardDescription = dueSoonCount
    ? "Stay ahead of this week's assignments."
    : "You're all caught up for the coming week."
  const completionInsightDescription = overdueCount
    ? `${overdueCount} chore${overdueCount === 1 ? "" : "s"} are overdue.`
    : "All chores are on schedule."

  return (
    <>
      <div className="xs:flex max-w-dvw w-full flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <TeamSwitcher />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <div className="flex items-center space-x-2">
              <CalendarDateRangePicker />
              <Button>Download</Button>
            </div>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics" disabled>
                Analytics
              </TabsTrigger>
              <TabsTrigger value="reports" disabled>
                Reports
              </TabsTrigger>
              <TabsTrigger value="notifications" disabled>
                Notifications
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Current streak
                    </CardTitle>
                    <Flame className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{streak.current_streak} days</div>
                    <p className="text-xs text-muted-foreground">Last completion: {lastCompletedLabel}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Longest streak</CardTitle>
                    <Award className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{streak.longest_streak} days</div>
                    <p className="text-xs text-muted-foreground">
                      Updated {analyticsUpdatedLabel}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion rate</CardTitle>
                    <CheckCircle2 className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{completionRate}%</div>
                    <Progress value={completionRate} className="mt-3 h-2" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {streak.total_completed} of {streak.total_assignments} assignments completed.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming chores</CardTitle>
                    <AlarmClock className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dueSoonCount}</div>
                    <p className="text-xs text-muted-foreground">{dueSoonMessage}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle>Streak trend</CardTitle>
                    <CardDescription>
                      Analytics refresh nightly to power gamification features.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2 pt-4">
                    <Overview data={streakChartData} />
                  </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Chore reminders</CardTitle>
                    <CardDescription>
                      Automatic notifications send two days before each deadline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales reminders={reminders} />
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle>Upcoming chore deadlines</CardTitle>
                    <CardDescription>{upcomingCardDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {upcomingAssignmentItems.length ? (
                      <ul className="space-y-3">
                        {upcomingAssignmentItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between rounded-md border border-border p-3"
                          >
                            <div>
                              <p className="text-sm font-medium leading-none">{item.choreTitle}</p>
                              <p className="text-xs text-muted-foreground">{item.dueCopy}</p>
                            </div>
                            {item.dueIn <= 2 ? (
                              <span className="text-xs font-semibold text-primary">
                                Reminder scheduled
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No upcoming chores within the next week.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Completion insights</CardTitle>
                    <CardDescription>{completionInsightDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Assignments completed</p>
                        <p className="text-2xl font-semibold">{streak.total_completed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total assignments</p>
                        <p className="text-2xl font-semibold">{streak.total_assignments}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                      Analytics last updated {analyticsUpdatedLabel}. Historical streak snapshots
                      are preserved for upcoming gamification features.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
