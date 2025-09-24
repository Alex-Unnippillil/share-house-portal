import { format, formatDistanceToNow } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Json } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

import { replayWebhookDeadLetter } from "./actions"

interface DeadLetterRecord {
  id: string
  event_type: string
  target_url: string
  subscription_name: string | null
  last_error: string | null
  response_status: number | null
  attempt_count: number
  failed_at: string | null
  replayed_at: string | null
  replayed_by: string | null
  payload: Json
  context: Json | null
}

function formatRelative(value: string | null) {
  if (!value) {
    return "Unknown"
  }

  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true })
  } catch (error) {
    console.error("Failed to format relative time", error)
    return value
  }
}

function formatAbsolute(value: string | null) {
  if (!value) {
    return "N/A"
  }

  try {
    return format(new Date(value), "MMM d, yyyy HH:mm")
  } catch (error) {
    console.error("Failed to format date", error)
    return value
  }
}

function stringify(value: Json | null) {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    console.error("Failed to stringify payload", error)
    return String(value)
  }
}

function DeadLetterCard({ record }: { record: DeadLetterRecord }) {
  const replayBadgeVariant = record.replayed_at ? "secondary" : "destructive"
  const replayStatus = record.replayed_at
    ? `Replayed ${formatRelative(record.replayed_at)}`
    : "Awaiting replay"

  const payloadString = stringify(record.payload)
  const contextString = record.context ? stringify(record.context) : null

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {record.event_type}
          </p>
          <p className="text-xs text-muted-foreground">
            {record.subscription_name ?? "Unnamed subscription"} • {record.target_url}
          </p>
        </div>
        <Badge variant={replayBadgeVariant}>{replayStatus}</Badge>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
        <p>
          <span className="font-medium text-foreground">Attempts:</span>{" "}
          {record.attempt_count}
        </p>
        <p>
          <span className="font-medium text-foreground">Response:</span>{" "}
          {record.response_status ?? "n/a"}
        </p>
        <p>
          <span className="font-medium text-foreground">Failed:</span>{" "}
          {formatRelative(record.failed_at)} ({formatAbsolute(record.failed_at)})
        </p>
        {record.replayed_at ? (
          <p>
            <span className="font-medium text-foreground">Replayed:</span>{" "}
            {formatAbsolute(record.replayed_at)}
          </p>
        ) : null}
        {record.replayed_by ? (
          <p>
            <span className="font-medium text-foreground">Replayed by:</span>{" "}
            {record.replayed_by}
          </p>
        ) : null}
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Last error</p>
        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed">
          {record.last_error ?? "No error message recorded."}
        </p>
      </div>

      <details className="rounded-md border bg-background">
        <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-medium text-foreground">
          Payload details
        </summary>
        <Separator />
        <div className="space-y-4 p-3 text-xs text-muted-foreground">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Payload
            </p>
            <pre className="mt-1 max-h-56 overflow-auto rounded bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {payloadString}
            </pre>
          </div>
          {contextString ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Context
              </p>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {contextString}
              </pre>
            </div>
          ) : null}
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {record.replayed_at
            ? replayStatus
            : "Replay once the downstream system is accepting traffic again."}
        </p>
        <form action={replayWebhookDeadLetter} className="flex items-center gap-2">
          <input type="hidden" name="deadLetterId" value={record.id} />
          <Button
            type="submit"
            size="sm"
            variant={record.replayed_at ? "outline" : "default"}
            disabled={Boolean(record.replayed_at)}
          >
            {record.replayed_at ? "Replayed" : "Replay delivery"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default async function WebhookDeadLettersPage() {
  const supabase = await createSupbaseServerClient()
  const { data, error } = await (supabase as any)
    .from("webhook_dead_letters")
    .select(
      "id, event_type, target_url, subscription_name, last_error, response_status, attempt_count, failed_at, replayed_at, replayed_by, payload, context"
    )
    .order("failed_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Failed to load webhook dead letters", error)
  }

  const records: DeadLetterRecord[] = (data ?? [])
  const unresolvedCount = records.filter((record) => !record.replayed_at).length
  const resolvedCount = records.length - unresolvedCount

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Webhook dead letters
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor webhook deliveries that exhausted retries. Replay payloads once
          your integration is healthy again.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery health</CardTitle>
          <CardDescription>
            Retry pipeline status and the most recent dead letter entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Active incidents
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {unresolvedCount}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Recently resolved
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {resolvedCount}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Logged entries
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {records.length}
              </p>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">
              Unable to load recent webhook failures: {error.message}
            </p>
          ) : null}

          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No webhook deliveries are currently in the dead letter queue.
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <DeadLetterCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
