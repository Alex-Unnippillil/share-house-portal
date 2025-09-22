import { Metadata } from "next"
import { differenceInCalendarDays, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CalendarDateRangePicker } from "@/app/dashboard/components/date-range-picker"
import { GarbageReminders, type GarbageReminderEvent } from "@/app/dashboard/components/garbage-reminders"
import { MainNav } from "@/app/dashboard/components/main-nav"
import { Overview } from "@/app/dashboard/components/overview"
import { RecentSales } from "@/app/dashboard/components/recent-sales"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import { buildRotatingAssignments, makeWasteAssignmentKey, normalizeTorontoAddress } from "@/lib/integrations/toronto-waste"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supabase/server"

type GarbageEventRow = Database["public"]["Tables"]["garbage_events"]["Row"]

const TORONTO_TIME_ZONE = "America/Toronto"

function getTodayInToronto() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const iso = formatter.format(new Date())
  return { iso, date: parseISO(iso) }
}

export const metadata: Metadata = {
  title: "Onyx Dashboard",
  description: "Manage your Onyx account and users.",
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { iso: torontoTodayIso, date: torontoTodayDate } = getTodayInToronto()

  let address: string | null = null
  let sourceUrl: string | null = null
  const reminders: {
    dayOf: GarbageReminderEvent[]
    tomorrow: GarbageReminderEvent[]
    upcoming: GarbageReminderEvent[]
  } = {
    dayOf: [],
    tomorrow: [],
    upcoming: [],
  }

  if (user) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, email, waddress')
      .eq('id', user.id)
      .limit(1)
    const profile = profileRows?.[0]

    if (profile?.waddress) {
      address = profile.waddress
      const normalizedAddress = normalizeTorontoAddress(profile.waddress)

      const { data: eventRows } = await supabase
        .from('garbage_events')
        .select('id, event_date, summary, materials, description, source_url, all_day')
        .eq('address_normalized', normalizedAddress)
        .gte('event_date', torontoTodayIso)
        .order('event_date', { ascending: true })

      const events = eventRows ?? []
      sourceUrl = events[0]?.source_url ?? null

      const { data: roommateRows } = await supabase
        .from('profiles')
        .select('id, full_name, email, waddress')
        .eq('waddress', profile.waddress)
        .order('full_name', { ascending: true })

      const roommates = (roommateRows ?? []).map(roommate => ({
        id: roommate.id,
        full_name: roommate.full_name,
        email: roommate.email,
      }))

      const assignments = buildRotatingAssignments(
        events.map(event => ({ date: event.event_date, summary: event.summary })),
        roommates
      )

      const toReminderEvent = (event: GarbageEventRow): GarbageReminderEvent => {
        const assignment = assignments.get(
          makeWasteAssignmentKey({ date: event.event_date, summary: event.summary })
        )
        return {
          id: event.id,
          eventDate: event.event_date,
          summary: event.summary,
          materials: event.materials ?? [],
          description: event.description,
          allDay: event.all_day ?? true,
          assignment: assignment
            ? { full_name: assignment.full_name, email: assignment.email }
            : null,
        }
      }

      reminders.dayOf = events
        .filter(event => differenceInCalendarDays(parseISO(event.event_date), torontoTodayDate) === 0)
        .map(toReminderEvent)

      reminders.tomorrow = events
        .filter(event => differenceInCalendarDays(parseISO(event.event_date), torontoTodayDate) === 1)
        .map(toReminderEvent)

      reminders.upcoming = events
        .filter(event => differenceInCalendarDays(parseISO(event.event_date), torontoTodayDate) > 1)
        .slice(0, 4)
        .map(toReminderEvent)
    }
  }

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
                      Total Revenue
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="size-4 text-muted-foreground"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$45,231.89</div>
                    <p className="text-xs text-muted-foreground">
                      +20.1% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Subscriptions
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="size-4 text-muted-foreground"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+2350</div>
                    <p className="text-xs text-muted-foreground">
                      +180.1% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sales</CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="size-4 text-muted-foreground"
                    >
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+12,234</div>
                    <p className="text-xs text-muted-foreground">
                      +19% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Now
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="size-4 text-muted-foreground"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+573</div>
                    <p className="text-xs text-muted-foreground">
                      +201 since last hour
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <Overview />
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                      You made 265 sales this month.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales />
                  </CardContent>
                </Card>
              </div>
              <GarbageReminders
                address={address}
                sourceUrl={sourceUrl}
                dayOf={reminders.dayOf}
                tomorrow={reminders.tomorrow}
                upcoming={reminders.upcoming}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}