"use client"

import { formatDistanceToNow, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { MaintenanceRequestRow } from "../lib/types"

type MaintenanceTableProps = {
  requests: MaintenanceRequestRow[]
  canManage: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500/15 text-amber-600",
  medium: "bg-blue-500/15 text-blue-600",
  low: "bg-muted text-muted-foreground",
}

export function MaintenanceTable({ requests, canManage }: MaintenanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open maintenance requests</CardTitle>
      </CardHeader>
      <CardContent>
        {canManage ? (
          requests.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticket</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {request.summary}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={PRIORITY_COLORS[request.priority?.toLowerCase() ?? ""]}
                        >
                          {request.priority ?? "Unspecified"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {request.status}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDistanceToNow(parseISO(request.submitted_at), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {request.sla_due_at
                          ? formatDistanceToNow(parseISO(request.sla_due_at), {
                              addSuffix: true,
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No open requests. Keep up the great work!
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage maintenance for this building.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

