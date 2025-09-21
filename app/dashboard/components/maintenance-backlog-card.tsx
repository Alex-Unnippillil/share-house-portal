"use client"

import { AlertTriangle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import type { BuildingRole, MaintenanceBacklogSummary } from "../lib/types"

const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "unspecified"]

type MaintenanceBacklogCardProps = {
  summary: MaintenanceBacklogSummary
  role: BuildingRole
  canView: boolean
}

export function MaintenanceBacklogCard({
  summary,
  role,
  canView,
}: MaintenanceBacklogCardProps) {
  const priorities = PRIORITY_ORDER.filter(
    (priority) => summary.byPriority[priority] !== undefined,
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 text-amber-500" />
          Maintenance Backlog
        </CardTitle>
        <span className="text-xs uppercase text-muted-foreground">{role}</span>
      </CardHeader>
      <CardContent>
        {canView ? (
          <div className="space-y-4">
            <div>
              <span className="text-2xl font-semibold">{summary.totalOpen}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                open tickets
              </span>
            </div>
            <div className="space-y-3">
              {priorities.map((priority) => {
                const value = summary.byPriority[priority] ?? 0
                const share = summary.totalOpen
                  ? Math.round((value / summary.totalOpen) * 100)
                  : 0
                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-muted-foreground">
                        {priority}
                      </span>
                      <span>{share}%</span>
                    </div>
                    <Progress value={share} className="h-2" />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Maintenance triage is unavailable for your current role.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

