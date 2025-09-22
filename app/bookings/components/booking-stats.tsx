import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBookingStats } from "@/lib/dashboard-data"
import { CalendarCheck, Clock, Users } from "lucide-react"

const icons = [CalendarCheck, Clock, Users]

export async function BookingStats() {
  const stats = await fetchBookingStats()

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = icons[index % icons.length]
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
