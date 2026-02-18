"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

type VisitorLog = {
  id: string
  guest_name: string
  host_name: string
  host_roommate_name: string
  check_in_date: string
  check_out_date: string
  reason: string
  status: "pending" | "approved" | "rejected" | "completed"
  approval_status: "pending" | "approved" | "rejected"
  requires_manager_approval: boolean
  created_at: string
}

type AuditEntry = {
  id: string
  visitor_log_id: string
  action: string
  notes: string | null
  created_at: string
}

function statusVariant(status: VisitorLog["status"]) {
  if (status === "approved") return "default"
  if (status === "rejected") return "destructive"
  if (status === "completed") return "secondary"
  return "outline"
}

export function ManagerVisitorOversight() {
  const { toast } = useToast()
  const [rows, setRows] = useState<VisitorLog[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/visitors?includeAudit=true", { cache: "no-store" })
      const payload = (await response.json()) as { data?: VisitorLog[]; audit?: AuditEntry[] }
      if (!response.ok) {
        throw new Error("Unable to load visitor requests")
      }

      setRows(payload.data ?? [])
      setAuditEntries(payload.audit ?? [])
    } catch (error) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Unable to load data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (id: string, status: VisitorLog["status"]) => {
    setIsUpdating(id)
    try {
      const response = await fetch(`/api/visitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Unable to update status")
      }

      await load()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const exportCsv = async () => {
    try {
      const response = await fetch("/api/visitors?format=csv", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Unable to export CSV")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `visitor-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to export",
        variant: "destructive",
      })
    }
  }

  const auditByVisitorId = useMemo(() => {
    const map = new Map<string, AuditEntry[]>()
    for (const entry of auditEntries) {
      const existing = map.get(entry.visitor_log_id) ?? []
      existing.push(entry)
      map.set(entry.visitor_log_id, existing)
    }
    return map
  }, [auditEntries])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Manager oversight</CardTitle>
          <CardDescription>Review approvals, inspect audit trail, and export visitor logs.</CardDescription>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading visitor requests…</p> : null}
        {!isLoading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visitor requests available.</p>
        ) : null}

        {rows.map((row) => (
          <div key={row.id} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{row.guest_name}</p>
                <p className="text-sm text-muted-foreground">
                  Host: {row.host_name} • Roommate host: {row.host_roommate_name || "n/a"}
                </p>
              </div>
              <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            </div>

            <p className="mt-2 text-sm">
              {format(new Date(row.check_in_date), "PPP")} → {format(new Date(row.check_out_date), "PPP")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{row.reason}</p>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => updateStatus(row.id, "approved")}
                disabled={isUpdating === row.id || row.status === "approved"}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => updateStatus(row.id, "rejected")}
                disabled={isUpdating === row.id || row.status === "rejected"}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateStatus(row.id, "completed")}
                disabled={isUpdating === row.id || row.status === "completed"}
              >
                Mark completed
              </Button>
            </div>

            <div className="mt-3 rounded-sm bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audit trail</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(auditByVisitorId.get(row.id) ?? []).slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    {format(new Date(entry.created_at), "PPp")}: {entry.action}
                    {entry.notes ? ` — ${entry.notes}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
