import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
  Megaphone,
  Pin,
  Wrench,
} from "lucide-react"

type PinnedAnnouncement = {
  id: string
  title: string
  message: string
  author: string
  postedAt: string
  pinnedUntil: string
  urgent?: boolean
  acknowledgements: {
    acknowledged: number
    total: number
  }
}

type MaintenanceNotification = {
  id: string
  title: string
  description: string
  status: string
  statusVariant: BadgeProps["variant"]
  scheduledFor: string
  accessNotes: string
  lastUpdated: string
  followUp: string
}

const pinnedAnnouncements: PinnedAnnouncement[] = [
  {
    id: "gas-inspection",
    title: "Gas line inspection this Friday",
    message:
      "State inspectors will be onsite between 9:00 AM and 11:30 AM. Please make sure utility closets remain clear for access.",
    author: "Jordan Mills",
    postedAt: "Sent Mar 10 • 8:40 AM",
    pinnedUntil: "Pinned through Mar 15",
    urgent: true,
    acknowledgements: {
      acknowledged: 11,
      total: 14,
    },
  },
  {
    id: "roof-repairs",
    title: "Roof repair staging in the courtyard",
    message:
      "Contractors will stage materials on Thursday evening. Walkways stay open—follow the taped lanes when moving through the area.",
    author: "Jordan Mills",
    postedAt: "Sent Mar 8 • 6:05 PM",
    pinnedUntil: "Pinned through Mar 13",
    acknowledgements: {
      acknowledged: 9,
      total: 14,
    },
  },
  {
    id: "resident-sync",
    title: "Monthly resident sync on Sunday",
    message:
      "Join the 20-minute check-in to review upcoming inspections and ask questions. RSVP in the portal calendar so we can plan snacks.",
    author: "Jordan Mills",
    postedAt: "Sent Mar 7 • 12:15 PM",
    pinnedUntil: "Pinned through Mar 16",
    acknowledgements: {
      acknowledged: 6,
      total: 14,
    },
  },
]

const maintenanceNotifications: MaintenanceNotification[] = [
  {
    id: "elevator-servicing",
    title: "Elevator servicing in Building B",
    description: "LiftCo technicians will recalibrate door sensors and run safety diagnostics.",
    status: "Scheduled",
    statusVariant: "secondary",
    scheduledFor: "Mar 12 • 1:00 – 3:00 PM",
    accessNotes: "Elevator offline 1:00 – 2:45 PM",
    lastUpdated: "Updated Mar 9 • 4:20 PM",
    followUp: "Auto reminder to send progress photos at 2:00 PM",
  },
  {
    id: "hvac-filters",
    title: "HVAC filter replacements",
    description: "Maintenance is replacing filters in all units—unlock utility closets before 9 AM.",
    status: "In progress",
    statusVariant: "default",
    scheduledFor: "Mar 11 • 9:00 AM – 12:00 PM",
    accessNotes: "Team currently servicing floor 3",
    lastUpdated: "Updated Mar 11 • 9:45 AM",
    followUp: "Completion confirmation requested by 1:00 PM",
  },
  {
    id: "laundry-repair",
    title: "Laundry room leak follow-up",
    description: "Drywall repairs scheduled after the overnight leak near washer #2. Area remains taped off.",
    status: "Action required",
    statusVariant: "destructive",
    scheduledFor: "Mar 10 • 2:30 – 5:00 PM",
    accessNotes: "Please move laundry carts by noon",
    lastUpdated: "Updated Mar 9 • 7:50 AM",
    followUp: "Tenants asked to upload photos if moisture returns",
  },
]

const deliveryInsights = [
  {
    title: "Median acknowledgement time",
    value: "1h 12m",
    description: "Down 18% vs last week across urgent announcements.",
  },
  {
    title: "Unread reminders queued",
    value: "2 roommates",
    description: "Auto nudges scheduled for this evening at 6:00 PM.",
  },
  {
    title: "Escalations triggered",
    value: "0 this week",
    description: "All urgent notices acknowledged before escalation threshold.",
  },
]

export function PropertyManagerUpdates() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Property manager updates</h2>
        <p className="text-sm text-muted-foreground">
          Pinned announcements and maintenance alerts stay surfaced until every roommate has confirmed they have seen them.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Megaphone className="size-4" />
              Broadcast board
            </div>
            <CardTitle>Pinned announcements</CardTitle>
            <CardDescription>
              Critical updates stay at the top of the feed until acknowledged by every roommate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pinnedAnnouncements.map((announcement) => {
              const { acknowledged, total } = announcement.acknowledgements
              const acknowledgementPercent = total > 0 ? Math.round((acknowledged / total) * 100) : 0

              return (
                <div
                  key={announcement.id}
                  className="rounded-lg border border-border/60 bg-muted/40 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="size-4 text-primary" />
                        <h3 className="text-base font-semibold leading-tight">{announcement.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{announcement.message}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="size-3" />
                        Pinned
                      </Badge>
                      {announcement.urgent ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Urgent
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden="true" />
                        <span>{announcement.postedAt}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Pin className="size-3.5" aria-hidden="true" />
                        <span>{announcement.pinnedUntil}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        <span>{announcement.author}</span>
                      </div>
                    </dl>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Acknowledged by {acknowledged} of {total} roommates
                        </span>
                        <span>{acknowledgementPercent}%</span>
                      </div>
                      <Progress
                        value={acknowledgementPercent}
                        aria-label={`Acknowledged by ${acknowledged} of ${total} roommates`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Wrench className="size-4" />
                Maintenance alerts
              </div>
              <CardTitle>In-flight maintenance notifications</CardTitle>
              <CardDescription>
                Tenants get real-time context on scheduled work, technician access, and follow-up expectations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {maintenanceNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-border/60 bg-background/60 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Wrench className="size-4 text-primary" />
                          <h3 className="text-sm font-semibold leading-tight">{notification.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                      </div>
                      <Badge variant={notification.statusVariant} className="self-start whitespace-nowrap">
                        {notification.status}
                      </Badge>
                    </div>
                    <dl className="grid gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        <span>{notification.scheduledFor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BellRing className="size-3.5" aria-hidden="true" />
                        <span>{notification.followUp}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden="true" />
                        <span>{notification.lastUpdated}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        <span>{notification.accessNotes}</span>
                      </div>
                    </dl>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery health</CardTitle>
              <CardDescription>
                Visibility metrics keep property managers ahead of unread announcements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveryInsights.map((insight, index) => (
                <div key={insight.title} className="space-y-2">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {insight.title}
                    </div>
                    <p className="text-lg font-semibold">{insight.value}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                  {index < deliveryInsights.length - 1 ? <Separator className="pt-2" /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
