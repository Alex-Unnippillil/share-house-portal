"use client"

import { format, formatDistanceToNow, parseISO } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { VisitorLogRow } from "../lib/types"

type VisitorOversightTableProps = {
  visitors: VisitorLogRow[]
  canReview: boolean
}

export function VisitorOversightTable({
  visitors,
  canReview,
}: VisitorOversightTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor oversight</CardTitle>
      </CardHeader>
      <CardContent>
        {canReview ? (
          visitors.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Visitor</th>
                    <th className="px-4 py-3 font-medium">Host</th>
                    <th className="px-4 py-3 font-medium">Arrival</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {visitor.visitor_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Unit {visitor.unit_id ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(parseISO(visitor.arrival_date), "MMM d, yyyy p")}<br />
                        <span className="text-xs">
                          {formatDistanceToNow(parseISO(visitor.arrival_date), {
                            addSuffix: true,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {visitor.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              There are no visitor bookings awaiting review.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Visitor oversight tools require building staff or manager access.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

