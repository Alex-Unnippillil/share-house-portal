import { formatDistanceToNow } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { MaintenanceQueue } from "../lib/data-sources"

type MaintenanceBacklogCardProps = {
  queue: MaintenanceQueue
}

export function MaintenanceBacklogCard({ queue }: MaintenanceBacklogCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance triage</CardTitle>
        <CardDescription>
          {queue.metrics.totalOpen} open — {queue.metrics.highPriority} high priority, {queue.metrics.awaitingAssignment} awaiting
          assignment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Metric label="Open" value={queue.metrics.totalOpen} />
          <Metric label="High priority" value={queue.metrics.highPriority} tone="destructive" />
          <Metric label="Unassigned" value={queue.metrics.awaitingAssignment} tone="secondary" />
        </div>
        <ul className="space-y-2">
          {queue.requests.slice(0, 6).map((request) => (
            <li key={request.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{request.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityVariant(request.priority)} className="capitalize">
                    {request.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {request.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                <span>
                  Submitted {formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true })}
                </span>
                <span>{request.assignedTo ? `Assigned to ${request.assignedTo}` : "Awaiting assignment"}</span>
              </div>
            </li>
          ))}
          {queue.requests.length === 0 ? (
            <li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No open maintenance tickets.
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}

type MetricProps = {
  label: string
  value: number
  tone?: "default" | "secondary" | "destructive"
}

function Metric({ label, value, tone = "default" }: MetricProps) {
  const toneStyles: Record<MetricProps["tone"], string> = {
    default: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/10 text-destructive",
  }
  return (
    <div className={`rounded-md px-3 py-2 text-xs uppercase tracking-wide ${toneStyles[tone]}`}>
      <span>{label}</span>
      <span className="ml-2 text-base font-semibold tracking-normal">{value}</span>
    </div>
  )
}

function priorityVariant(priority: string): "destructive" | "secondary" | "outline" {
  if (priority === "high") return "destructive"
  if (priority === "medium") return "secondary"
  return "outline"
}
