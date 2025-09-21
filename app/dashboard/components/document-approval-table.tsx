import { Badge } from "@/components/ui/badge"

import type { DocumentApproval } from "../lib/data-sources"

type DocumentApprovalTableProps = {
  approvals: DocumentApproval[]
}

export function DocumentApprovalTable({ approvals }: DocumentApprovalTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Document</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resident</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {approvals.map((approval) => (
            <tr key={approval.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{approval.documentTitle}</td>
              <td className="px-4 py-3 text-muted-foreground">{approval.residentName ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(approval.submittedAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">
                  {approval.status.replace(/_/g, " ")}
                </Badge>
              </td>
            </tr>
          ))}
          {approvals.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>
                No document approvals pending.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
