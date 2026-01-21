import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck, Clock, Users } from "lucide-react"

type BookingStat = {
  title: string
  value: string
  Icon: typeof CalendarCheck
  semanticMetricId: string
}

export function BookingStats() {
  const stats: BookingStat[] = [
    {
      title: "This week",
      value: "8 bookings",
      Icon: CalendarCheck,
      semanticMetricId: "amenity_bookings_confirmed_count",
    },
    {
      title: "Avg duration",
      value: "1.7 hours",
      Icon: Clock,
      semanticMetricId: "amenity_booking_avg_duration_hours",
    },
    {
      title: "Participants",
      value: "12 roommates",
      Icon: Users,
      semanticMetricId: "amenity_bookings_active_households",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} data-semantic-metric={stat.semanticMetricId}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              Semantic metric: <code className="font-mono text-xs">{stat.semanticMetricId}</code>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



