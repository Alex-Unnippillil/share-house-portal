import { Badge } from "@/components/ui/badge"

import type { VisitorApproval } from "../lib/data-sources"

type VisitorOversightTableProps = {
  approvals: VisitorApproval[]
}

export function VisitorOversightTable({ approvals }: VisitorOversightTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visitor</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Host</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Arrival</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {approvals.map((approval) => (
            <tr key={approval.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{approval.visitorName}</td>
              <td className="px-4 py-3 text-muted-foreground">{approval.hostName ?? "Unknown"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(approval.arrivalDate).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="capitalize">
                  {approval.approvalStatus.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="max-w-xs px-4 py-3 text-muted-foreground">
                {approval.notes ?? "—"}
              </td>
            </tr>
          ))}
          {approvals.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                No visitor approvals pending.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
