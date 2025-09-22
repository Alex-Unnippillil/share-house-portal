import { Metadata } from "next"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupbaseServerClient } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Visitor access",
  description: "Review overnight guest requests and access codes.",
}

type VisitorRequest = {
  id: string
  guest_name: string
  guest_email: string | null
  visit_start: string
  visit_end: string
  status: "pending" | "approved" | "denied" | "revoked"
  access_code: string | null
  access_code_issued_at: string | null
  access_code_expires_at: string | null
  revoked_at: string | null
}

type AuditEntry = {
  visitor_request_id: string
  event: "code_issued" | "revocation_scheduled" | "revoked"
  status: string
  created_at: string
}

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const statusLabels: Record<VisitorRequest["status"], string> = {
  pending: "Pending approval",
  approved: "Approved",
  denied: "Denied",
  revoked: "Revoked",
}

function formatDate(value: string | null) {
  if (!value) {
    return "—"
  }

  return formatter.format(new Date(value))
}

function resolveRevocationStatus(request: VisitorRequest, audits: AuditEntry[]) {
  if (request.status === "revoked") {
    const revokedEntry = audits.find((entry) => entry.event === "revoked" && entry.status === "completed")
    if (revokedEntry) {
      return `Revoked ${formatDate(revokedEntry.created_at)}`
    }

    return request.revoked_at ? `Revoked ${formatDate(request.revoked_at)}` : "Revoked"
  }

  const scheduledEntry = audits.find((entry) => entry.event === "revocation_scheduled")
  if (scheduledEntry) {
    return `Scheduled for ${formatDate(request.access_code_expires_at)}`
  }

  if (request.status === "approved") {
    return request.access_code_expires_at
      ? `Scheduled for ${formatDate(request.access_code_expires_at)}`
      : "Revocation scheduled"
  }

  return "—"
}

export default async function VisitorRequestsPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/auth")
  }

  const { data: requests } = await supabase
    .from("visitor_requests")
    .select(
      "id, guest_name, guest_email, visit_start, visit_end, status, access_code, access_code_issued_at, access_code_expires_at, revoked_at"
    )
    .eq("host_profile_id", user.id)
    .order("visit_start", { ascending: false })

  const requestRows: VisitorRequest[] = requests ?? []
  const requestIds = requestRows.map((request) => request.id)

  let auditMap = new Map<string, AuditEntry[]>()

  if (requestIds.length > 0) {
    const { data: audits } = await supabase
      .from("visitor_access_audit")
      .select("visitor_request_id, event, status, created_at")
      .in("visitor_request_id", requestIds)
      .order("created_at", { ascending: false })

    if (audits) {
      auditMap = audits.reduce((acc, audit) => {
        const existing = acc.get(audit.visitor_request_id) ?? []
        existing.push(audit as AuditEntry)
        acc.set(audit.visitor_request_id, existing)
        return acc
      }, new Map<string, AuditEntry[]>())
    }
  }

  return (
    <div className="max-w-dvw flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Visitor access</h1>
        <p className="text-muted-foreground">
          Approved guest stays receive a temporary access code. Codes expire automatically after the visit window.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {requestRows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No visitor requests yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Once you submit an overnight visitor request you&apos;ll see approval details and access codes here.
              </p>
            </CardContent>
          </Card>
        ) : (
          requestRows.map((request) => {
            const audits = auditMap.get(request.id) ?? []
            const revocationStatus = resolveRevocationStatus(request, audits)
            const codeActive = request.status === "approved" && !request.revoked_at

            return (
              <Card key={request.id}>
                <CardHeader className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl font-semibold">{request.guest_name}</CardTitle>
                    <Badge
                      variant={request.status === "approved" ? "default" : request.status === "pending" ? "secondary" : "destructive"}
                    >
                      {statusLabels[request.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(request.visit_start)} – {formatDate(request.visit_end)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {request.guest_email ? (
                    <div>
                      <p className="font-medium">Guest email</p>
                      <p className="text-muted-foreground">{request.guest_email}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="font-medium">Access code</p>
                    <p className="text-muted-foreground">
                      {codeActive && request.access_code ? request.access_code : "Code unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Issued</p>
                    <p className="text-muted-foreground">{formatDate(request.access_code_issued_at)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Revocation</p>
                    <p className="text-muted-foreground">{revocationStatus}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
