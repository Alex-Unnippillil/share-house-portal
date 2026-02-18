"use client"

import { useMemo, useState } from "react"
import { formatDistanceToNowStrict } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/payments/currency"
import type { ReconciliationPaymentItem } from "../loaders"

interface ReconciliationDashboardCardProps {
  failedPayments: ReconciliationPaymentItem[]
}

type TriageStatus = "open" | "investigating" | "resolved"

const triageBadgeVariant: Record<TriageStatus, "outline" | "secondary" | "default"> = {
  open: "outline",
  investigating: "secondary",
  resolved: "default",
}

export function ReconciliationDashboardCard({
  failedPayments,
}: ReconciliationDashboardCardProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      failedPayments.map((payment) => [payment.id, payment.triageNotes ?? ""])
    )
  )
  const [statusById, setStatusById] = useState<Record<string, TriageStatus>>(() =>
    Object.fromEntries(failedPayments.map((payment) => [payment.id, payment.triageStatus]))
  )

  const openCount = useMemo(
    () =>
      failedPayments.filter((payment) => {
        const status = statusById[payment.id] ?? payment.triageStatus
        return status !== "resolved"
      }).length,
    [failedPayments, statusById]
  )

  const handleSave = async (paymentId: string) => {
    setSubmittingId(paymentId)

    try {
      await fetch("/api/payments/reconciliation/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          triageStatus: statusById[paymentId] ?? "open",
          triageNotes: notesById[paymentId] ?? "",
        }),
      })
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Failed-payment reconciliation</CardTitle>
          <CardDescription>
            Triages declined rent charges, track manager follow-up, and export CSV for finance reconciliation.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{openCount} unresolved</Badge>
          <Button asChild size="sm" variant="outline">
            <a href="/api/payments/reconciliation/export">Export CSV</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!failedPayments.length ? (
          <p className="text-sm text-muted-foreground">
            No failed payments right now. Your Stripe rent collection is fully reconciled.
          </p>
        ) : (
          failedPayments.map((payment) => {
            const status = statusById[payment.id] ?? payment.triageStatus
            const notes = notesById[payment.id] ?? ""

            return (
              <div key={payment.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{payment.tenantName}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.description ?? "Rent payment"}
                    </p>
                    {payment.processedAt ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(payment.processedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <Badge variant={triageBadgeVariant[status]}>{status}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`triage-${payment.id}`}>Triage</Label>
                    <select
                      id={`triage-${payment.id}`}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={status}
                      onChange={(event) =>
                        setStatusById((prev) => ({
                          ...prev,
                          [payment.id]: event.target.value as TriageStatus,
                        }))
                      }
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`notes-${payment.id}`}>Manager notes</Label>
                    <Input
                      id={`notes-${payment.id}`}
                      value={notes}
                      placeholder="Contacted tenant, retrying card tomorrow"
                      onChange={(event) =>
                        setNotesById((prev) => ({
                          ...prev,
                          [payment.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={submittingId === payment.id}
                    onClick={() => handleSave(payment.id)}
                  >
                    {submittingId === payment.id ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
