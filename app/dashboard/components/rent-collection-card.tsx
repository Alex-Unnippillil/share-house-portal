"use client"

import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getRoleLabel } from "../lib/access"
import type { BuildingRole, RentCollectionSummary } from "../lib/types"

type RentCollectionCardProps = {
  summary: RentCollectionSummary
  role: BuildingRole
  canView: boolean
  buildingName: string
}

export function RentCollectionCard({
  summary,
  role,
  canView,
  buildingName,
}: RentCollectionCardProps) {
  const collectionRate = Math.round(summary.collectionRate * 100)
  const trendIcon =
    summary.collectionRate >= 0.95 ? (
      <TrendingUp className="size-4 text-emerald-500" />
    ) : (
      <TrendingDown className="size-4 text-amber-500" />
    )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Rent Collection — {buildingName}
        </CardTitle>
        <Badge variant="secondary" className="capitalize">
          {getRoleLabel(role)}
        </Badge>
      </CardHeader>
      <CardContent>
        {canView ? (
          <div className="space-y-3">
            <div className="text-2xl font-bold">
              ${summary.totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                of ${summary.totalDue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {trendIcon}
              <span className="font-medium">{collectionRate}% collected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <Metric label="Outstanding" value={summary.outstanding} />
              <Metric label="Delinquent leases" value={summary.overdueCount} isCount />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Rent performance is hidden for your current role.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  isCount = false,
}: {
  label: string
  value: number
  isCount?: boolean
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {isCount
          ? value
          : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      </p>
    </div>
  )
}

