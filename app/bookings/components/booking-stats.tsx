import { CalendarCheck, Clock3, Users2 } from "lucide-react"

import { createClient } from "@/utils/supabase/server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export async function BookingStats() {
  const supabase = createClient()

  const nowIso = new Date().toISOString()

  const [activeCountResult, upcomingCountResult, uniqueAmenityResult] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .neq("status", "cancelled")
      .gte("start_time", nowIso),
    supabase.from("bookings").select("amenity_id"),
  ])

  const uniqueAmenities = new Set((uniqueAmenityResult.data ?? []).map((item) => item.amenity_id)).size

  const stats = [
    {
      title: "Active bookings",
      value: `${activeCountResult.count ?? 0}`,
      caption: "Mirrored from Cal.com",
      Icon: CalendarCheck,
    },
    {
      title: "Upcoming",
      value: `${upcomingCountResult.count ?? 0}`,
      caption: "Starting later today and beyond",
      Icon: Clock3,
    },
    {
      title: "Amenities in use",
      value: `${uniqueAmenities}`,
      caption: "Unique amenity calendars",
      Icon: Users2,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.caption}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
