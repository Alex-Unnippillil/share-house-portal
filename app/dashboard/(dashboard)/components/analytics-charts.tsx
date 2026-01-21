"use client"

import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const rentCollectionData = [
  { month: "Jan", collected: 94 },
  { month: "Feb", collected: 96 },
  { month: "Mar", collected: 98 },
  { month: "Apr", collected: 97 },
  { month: "May", collected: 99 },
  { month: "Jun", collected: 100 },
]

const rentCollectionMetricId = "rent_collection_rate"

const maintenanceData = [
  { month: "Jan", resolved: 8 },
  { month: "Feb", resolved: 11 },
  { month: "Mar", resolved: 9 },
  { month: "Apr", resolved: 13 },
  { month: "May", resolved: 15 },
  { month: "Jun", resolved: 12 },
]

const maintenanceResolvedMetricId = "maintenance_resolved_count"

const churnData = [
  { label: "Renewing", value: 64 },
  { label: "Undecided", value: 22 },
  { label: "Moving", value: 14 },
]

export default function AnalyticsCharts() {
  const maxRentCollection = useMemo(
    () => Math.max(...rentCollectionData.map((entry) => entry.collected)),
    []
  )

  const maxMaintenance = useMemo(
    () => Math.max(...maintenanceData.map((entry) => entry.resolved)),
    []
  )

  const maintenancePath = useMemo(() => {
    if (maintenanceData.length === 0) {
      return ""
    }

    const points = maintenanceData.map((entry, index) => {
      const x = (index / (maintenanceData.length - 1)) * 100
      const y = 100 - (entry.resolved / maxMaintenance) * 100
      return `${x},${y}`
    })

    return `M0,100 L${points.join(" ")} L100,100 Z`
  }, [maxMaintenance])

  const totalChurn = useMemo(
    () => churnData.reduce((total, entry) => total + entry.value, 0),
    []
  )

  const churnSlices = useMemo(() => {
    if (totalChurn === 0) {
      return []
    }

    let cursor = 0

    return churnData.map((entry) => {
      const sliceAngle = (entry.value / totalChurn) * 360
      const start = cursor
      const end = cursor + sliceAngle
      cursor = end

      const x1 = 50 + 50 * Math.cos((Math.PI * start) / 180)
      const y1 = 50 + 50 * Math.sin((Math.PI * start) / 180)
      const x2 = 50 + 50 * Math.cos((Math.PI * end) / 180)
      const y2 = 50 + 50 * Math.sin((Math.PI * end) / 180)
      const largeArc = sliceAngle > 180 ? 1 : 0
      const midAngle = start + sliceAngle / 2
      const labelRadius = 32
      const labelX = 50 + labelRadius * Math.cos((Math.PI * midAngle) / 180)
      const labelY = 50 + labelRadius * Math.sin((Math.PI * midAngle) / 180)

      return {
        entry,
        path: `M50,50 L${x1},${y1} A50,50 0 ${largeArc} 1 ${x2},${y2} Z`,
        labelX,
        labelY,
      }
    })
  }, [totalChurn])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70" data-semantic-metric={rentCollectionMetricId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Rent collection velocity
              <Badge variant="outline" className="text-xs font-medium">
                +3.2% vs last quarter
              </Badge>
            </CardTitle>
            <CardDescription>
              Percentage of rent collected on time by month for the current lease cycle.
              <span className="mt-2 block text-xs text-muted-foreground">
                Semantic metric: <code className="font-mono text-xs">{rentCollectionMetricId}</code>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent data-semantic-metric={rentCollectionMetricId}>
            <div className="flex h-56 items-end gap-3">
              {rentCollectionData.map((entry) => (
                <div key={entry.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex size-full items-end justify-center rounded-md bg-gradient-to-t from-primary/10 via-primary/40 to-primary/80">
                    <div
                      className="w-full rounded-md bg-primary"
                      style={{
                        height: `${(entry.collected / maxRentCollection) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">{entry.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70" data-semantic-metric={maintenanceResolvedMetricId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Maintenance resolution pace
              <Badge variant="secondary" className="text-xs font-medium">
                SLA hit 92%
              </Badge>
            </CardTitle>
            <CardDescription>
              Tickets resolved per month with cumulative pace towards the quarterly SLA target.
              <span className="mt-2 block text-xs text-muted-foreground">
                Semantic metric: <code className="font-mono text-xs">{maintenanceResolvedMetricId}</code>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <svg
              viewBox="0 0 100 100"
              className="h-56 w-full overflow-visible rounded-lg bg-gradient-to-b from-primary/5 via-background to-background"
              role="img"
              aria-label="Maintenance tickets resolved per month"
              data-semantic-metric={maintenanceResolvedMetricId}
            >
              <defs>
                <linearGradient id="maintenanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path d={maintenancePath} fill="url(#maintenanceGradient)" stroke="hsl(var(--primary))" strokeWidth="1.2" />
              {maintenanceData.map((entry, index) => {
                const x = (index / (maintenanceData.length - 1)) * 100
                const y = 100 - (entry.resolved / maxMaintenance) * 100
                return (
                  <g key={entry.month}>
                    <circle cx={x} cy={y} r={1.5} fill="hsl(var(--primary))" />
                    <text
                      x={x}
                      y={y - 4}
                      textAnchor="middle"
                      className="fill-foreground text-[3px]"
                    >
                      {entry.resolved}
                    </text>
                  </g>
                )
              })}
              <g className="fill-muted-foreground text-[3px]">
                {maintenanceData.map((entry, index) => {
                  const x = (index / (maintenanceData.length - 1)) * 100
                  return (
                    <text key={entry.month} x={x} y={104} textAnchor="middle">
                      {entry.month}
                    </text>
                  )
                })}
              </g>
            </svg>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            Renewal sentiment snapshot
            <Badge variant="outline" className="text-xs font-medium">
              Survey sample 48 residents
            </Badge>
          </CardTitle>
          <CardDescription>
            Aggregate of the latest roommate sentiment survey indicating intent to renew.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
            <div className="flex items-center justify-center">
              <div className="relative size-40" role="img" aria-label="Resident renewal sentiment distribution">
                <svg viewBox="0 0 100 100" className="absolute inset-0">
                  {churnSlices.map(({ entry, path, labelX, labelY }) => (
                    <g key={entry.label}>
                      <path d={path} fill={segmentColor(entry.label)} />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        className="fill-background text-[10px] font-semibold"
                      >
                        {`${entry.value}%`}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className="absolute inset-6 rounded-full bg-background shadow-inner" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-muted-foreground">Renewal mix</span>
                </div>
              </div>
            </div>
            <dl className="space-y-3">
              {churnData.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: segmentColor(entry.label) }} />
                    <dt className="text-sm font-medium text-foreground">{entry.label}</dt>
                  </div>
                  <dd className="text-sm font-semibold text-muted-foreground">{entry.value}%</dd>
                </div>
              ))}
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function segmentColor(label: string) {
  switch (label) {
    case "Renewing":
      return "hsl(var(--primary))"
    case "Undecided":
      return "hsl(var(--chart-2, 215 20% 65%))"
    case "Moving":
      return "hsl(var(--destructive))"
    default:
      return "hsl(var(--muted))"
  }
}
