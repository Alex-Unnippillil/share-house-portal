import { Badge } from "@/components/ui/badge"

import type { MaintenanceQueue } from "../lib/data-sources"

type MaintenanceRequestTableProps = {
  queue: MaintenanceQueue
}

export function MaintenanceRequestTable({ queue }: MaintenanceRequestTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Ticket
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Priority
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Assigned to
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Submitted
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {queue.requests.map((request) => (
            <tr key={request.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{request.title}</td>
              <td className="px-4 py-3">
                <Badge variant={priorityVariant(request.priority)} className="capitalize">
                  {request.priority}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">
                  {request.status.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {request.assignedTo ?? "Unassigned"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(request.submittedAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {queue.requests.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                No open maintenance requests for this building.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function priorityVariant(priority: string): "destructive" | "secondary" | "outline" {
  if (priority === "high") return "destructive"
  if (priority === "medium") return "secondary"
  return "outline"
}
