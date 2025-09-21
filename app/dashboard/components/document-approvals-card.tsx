"use client"

import { FileCheck2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { DocumentApprovalSummary } from "../lib/types"

type DocumentApprovalsCardProps = {
  summary: DocumentApprovalSummary
  canView: boolean
}

export function DocumentApprovalsCard({
  summary,
  canView,
}: DocumentApprovalsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileCheck2 className="size-4 text-primary" />
          Document Approvals
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {summary.overdueCount} overdue
        </span>
      </CardHeader>
      <CardContent>
        {canView ? (
          <div className="space-y-3">
            <div className="text-2xl font-bold">{summary.pendingCount}</div>
            <p className="text-sm text-muted-foreground">
              envelopes awaiting manager or admin sign-off
            </p>
            {summary.overdueCount > 0 && (
              <p className="text-xs font-medium text-destructive">
                {summary.overdueCount} items exceed their SLA deadline.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Compliance documents require elevated permissions.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

