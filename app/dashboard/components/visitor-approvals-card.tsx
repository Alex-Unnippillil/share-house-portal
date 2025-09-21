"use client"

import { CalendarClock } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { VisitorApprovalSummary } from "../lib/types"

type VisitorApprovalsCardProps = {
  summary: VisitorApprovalSummary
  canView: boolean
}

export function VisitorApprovalsCard({
  summary,
  canView,
}: VisitorApprovalsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 text-sky-500" />
          Visitor Approvals
        </CardTitle>
        <span className="text-xs text-muted-foreground">7-day outlook</span>
      </CardHeader>
      <CardContent>
        {canView ? (
          <div className="space-y-3">
            <div className="text-2xl font-bold">{summary.pendingCount}</div>
            <p className="text-sm text-muted-foreground">
              approvals waiting for manager review
            </p>
            <div className="rounded-md bg-muted/60 p-3 text-xs">
              <span className="font-semibold text-foreground">
                {summary.upcomingVisits}
              </span>{" "}
              approved visits starting in the next week
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Visitor approvals are hidden for this role.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

