import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import Table from "@/components/ui/Table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getPrivacyRequestEvents,
  getPrivacyRequests,
  groupEventsByRequest,
  summarisePrivacyRequests,
  type PrivacyRequest,
  type PrivacyRequestEvent,
} from "@/lib/data/privacy"
import { createClient } from "@/utils/supabase/server"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const statusVariants: Record<PrivacyRequest["status"], "default" | "secondary" | "destructive" | "complete"> = {
  received: "secondary",
  in_progress: "secondary",
  completed: "complete",
  failed: "destructive",
}

const statusLabels: Record<PrivacyRequest["status"], string> = {
  received: "Received",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
}

const typeLabels: Record<PrivacyRequest["request_type"], string> = {
  export: "Data Export",
  erasure: "Erasure",
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return format(new Date(value), "MMM d, yyyy HH:mm")
}

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 6)}…${id.slice(-4)}`
}

function StatusBadge({ status }: { status: PrivacyRequest["status"] }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
}

function RequestRows({
  requests,
  eventMap,
}: {
  requests: PrivacyRequest[]
  eventMap: Record<string, PrivacyRequestEvent[]>
}) {
  if (!requests.length) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No privacy requests have been logged yet.
      </div>
    )
  }

  return (
    <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
      {requests.map((request) => {
        const events = eventMap[request.id] ?? []
        const latestEvent = events.at(-1)
        return (
          <div
            key={request.id}
            className="grid grid-cols-5 items-center gap-4 rounded-sm p-3 text-sm"
          >
            <div className="truncate">
              <p className="font-medium">{truncateId(request.tenant_id)}</p>
              <p className="text-xs text-muted-foreground">
                {request.requester_email ?? "—"}
              </p>
            </div>
            <div>
              <Badge variant="secondary">{typeLabels[request.request_type]}</Badge>
            </div>
            <div>
              <StatusBadge status={request.status} />
            </div>
            <div className="space-y-1">
              <p>{formatDate(request.requested_at)}</p>
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(request.updated_at)}
              </p>
            </div>
            <div className="space-y-1">
              <p>{formatDate(request.completed_at)}</p>
              {latestEvent?.detail ? (
                <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                  {latestEvent.detail}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecentEvents({ events }: { events: PrivacyRequestEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity recorded for privacy workflows yet.
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{event.status}</p>
            {event.detail ? (
              <p className="text-sm text-muted-foreground">{event.detail}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
        </li>
      ))}
    </ul>
  )
}

export default async function CompliancePage() {
  const supabase = createClient()
  const typedClient = supabase as unknown as TypedSupabaseClient
  const requests = await getPrivacyRequests(typedClient, { limit: 25 })
  const events = await getPrivacyRequestEvents(
    typedClient,
    requests.map((request) => request.id),
  )
  const eventMap = groupEventsByRequest(events)
  const summary = summarisePrivacyRequests(requests)
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Privacy compliance</h1>
        <p className="text-muted-foreground">
          Review DSAR fulfilment across Supabase, Stripe, Documenso, and Cal.com.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Open requests</CardTitle>
            <CardDescription>Received or currently in progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Requests successfully fulfilled.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Failed</CardTitle>
            <CardDescription>Requests needing manual attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-destructive">{summary.failed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Privacy requests</CardTitle>
          <CardDescription>Most recent DSARs and erasure workflows.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table headers={["Tenant", "Type", "Status", "Requested", "Completed"]}>
            <RequestRows requests={requests} eventMap={eventMap} />
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>System generated audit trail entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentEvents events={recentEvents} />
        </CardContent>
      </Card>
    </div>
  )
}
