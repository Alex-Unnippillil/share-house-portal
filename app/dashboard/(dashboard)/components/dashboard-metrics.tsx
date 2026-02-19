import { CalendarDays, CreditCard, UsersRound, Wrench } from "lucide-react"

import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getDashboardMetrics, getDashboardRole } from "../data"

type TrendCopyKey = "up" | "down" | "neutral"

type TrendCopy = Record<TrendCopyKey, { prefix: string }>

const iconMap = {
  rent: CreditCard,
  calendar: CalendarDays,
  roommates: UsersRound,
  maintenance: Wrench,
} as const

const trendCopy: TrendCopy = {
  up: {
    prefix: "Improving",
  },
  down: {
    prefix: "Stable",
  },
  neutral: {
    prefix: "Scheduled",
  },
}

export async function DashboardMetrics() {
  const [metrics, role] = await Promise.all([
    getDashboardMetrics(),
    getDashboardRole(),
  ])
  const roleCue = getRoleCue(role)

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "surface-solid flex items-center justify-between rounded-lg p-3",
          roleCue.accentClassName
        )}
      >
        <div className="flex items-center gap-2">
          <span className="role-cue-dot" aria-hidden="true" />
          <p className="role-cue-heading text-sm font-medium">
            Performance overview
          </p>
        </div>
        <span className="role-cue-badge">{roleCue.roleLabel}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = iconMap[metric.icon]
          const trend = trendCopy[metric.trend.direction]

          return (
            <Card key={metric.id} surface="solid">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="flex size-9 items-center justify-center border-muted-foreground/40 bg-muted/60"
                >
                  <Icon className="size-4 text-primary" />
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold text-foreground">
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metric.helperText}
                </p>
                <p className="text-xs font-medium text-primary">
                  {trend.prefix} • {metric.trend.label}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
