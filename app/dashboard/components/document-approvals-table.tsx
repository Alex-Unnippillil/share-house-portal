"use client"

import { format, parseISO } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { DocumentApprovalRow } from "../lib/types"

type DocumentApprovalsTableProps = {
  documents: DocumentApprovalRow[]
  canReview: boolean
}

export function DocumentApprovalsTable({
  documents,
  canReview,
}: DocumentApprovalsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending document approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {canReview ? (
          documents.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Requested</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {doc.document_title}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(parseISO(doc.requested_at), "MMM d, yyyy p")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {doc.due_at
                          ? format(parseISO(doc.due_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {doc.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No outstanding documents require approval.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Document approvals require property manager or platform admin access.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

