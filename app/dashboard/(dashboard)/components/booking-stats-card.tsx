import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBookingStats } from "@/lib/dashboard-data"
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: ArrowRight,
}

export async function BookingStatsCard() {
  const stats = await fetchBookingStats()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking utilization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat) => {
          const Icon = trendIcon[stat.trend]
          return (
            <div key={stat.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-base font-medium">{stat.value}</p>
              </div>
              <Icon className="size-4 text-muted-foreground" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
