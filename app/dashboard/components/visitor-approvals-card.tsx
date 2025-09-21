import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { VisitorApproval } from "../lib/data-sources"

type VisitorApprovalsCardProps = {
  approvals: VisitorApproval[]
}

export function VisitorApprovalsCard({ approvals }: VisitorApprovalsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor approvals</CardTitle>
        <CardDescription>
          Track overnight guest requests requiring manager review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {approvals.slice(0, 5).map((approval) => (
            <li key={approval.id} className={cn("border border-border p-3", "rounded-md")}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{approval.visitorName}</p>
                  <p className="text-muted-foreground">
                    Host: {approval.hostName ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Arrival {format(new Date(approval.arrivalDate), "MMM d")}
                  </p>
                </div>
                <Badge variant="secondary" className="whitespace-nowrap capitalize">
                  {approval.approvalStatus.replace(/_/g, " ")}
                </Badge>
              </div>
              {approval.notes ? (
                <p className="mt-2 text-xs text-muted-foreground">{approval.notes}</p>
              ) : null}
            </li>
          ))}
          {approvals.length === 0 ? (
            <li
              className={cn(
                "border border-dashed border-border p-4 text-center text-muted-foreground",
                "rounded-md"
              )}
            >
              No pending visitor approvals.
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}
