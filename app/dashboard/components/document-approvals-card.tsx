import { formatDistanceToNow } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { DocumentApproval } from "../lib/data-sources"

type DocumentApprovalsCardProps = {
  approvals: DocumentApproval[]
}

export function DocumentApprovalsCard({ approvals }: DocumentApprovalsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document workflows</CardTitle>
        <CardDescription>Lease and policy packets awaiting sign-off.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {approvals.slice(0, 5).map((approval) => (
            <li key={approval.id} className={cn("border border-border p-3", "rounded-md")}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{approval.documentTitle}</p>
                  {approval.residentName ? (
                    <p className="text-xs text-muted-foreground">{approval.residentName}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="whitespace-nowrap capitalize">
                  {approval.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted {formatDistanceToNow(new Date(approval.submittedAt), { addSuffix: true })}
              </p>
            </li>
          ))}
          {approvals.length === 0 ? (
            <li
              className={cn(
                "border border-dashed border-border p-4 text-center text-muted-foreground",
                "rounded-md"
              )}
            >
              All documents are complete.
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}
