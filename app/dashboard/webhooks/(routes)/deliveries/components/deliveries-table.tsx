"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, redactSensitiveValues } from "@/lib/utils"
import type {
  WebhookDeliveryRecord,
  WebhookDeliveryStatus,
} from "@/lib/data/webhook-deliveries"

const STATUS_COPY: Record<
  WebhookDeliveryStatus,
  { label: string; badge: BadgeProps["variant"] }
> = {
  delivered: { label: "Delivered", badge: "complete" },
  failed: { label: "Failed", badge: "destructive" },
  queued: { label: "Queued", badge: "secondary" },
}

const formatTimestamp = (timestamp: string | null | undefined) => {
  if (!timestamp) return "—"
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp))
  } catch (error) {
    return timestamp
  }
}

const formatLatency = (latency: number | null) => {
  if (latency === null || Number.isNaN(latency)) return "—"
  if (latency < 1000) return `${latency} ms`
  const seconds = latency / 1000
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`
}

const resolveHost = (url: string) => {
  try {
    return new URL(url).host
  } catch (error) {
    return url
  }
}

const formatJson = (value: unknown) => {
  if (value === null) return "null"
  if (value === undefined) return "—"
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

type DeliveriesTableProps = {
  deliveries: WebhookDeliveryRecord[]
}

export function DeliveriesTable({ deliveries }: DeliveriesTableProps) {
  const router = useRouter()
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isRefreshing, startTransition] = useTransition()

  const toggleRow = (id: string) => {
    setExpandedRows((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  const queueReplay = async (deliveryId: string) => {
    setError(null)
    setSuccessMessage(null)
    setActiveReplayId(deliveryId)

    try {
      const response = await fetch("/api/webhooks/replay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deliveryId }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMessage =
          (payload && typeof payload === "object" && "error" in payload
            ? (payload.error as string)
            : null) ?? "Unable to queue replay"
        throw new Error(errorMessage)
      }

      setSuccessMessage(
        `Replay queued for delivery ${deliveryId}. Audit log refreshed.`
      )

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to queue replay"
      )
    } finally {
      setActiveReplayId(null)
    }
  }

  const isReplayDisabled = (delivery: WebhookDeliveryRecord) =>
    delivery.pendingReplay || activeReplayId === delivery.id || isRefreshing

  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader>
        <CardTitle>Recent deliveries</CardTitle>
        <CardDescription>
          Monitor webhook delivery outcomes, inspect payloads, and manually
          replay failed attempts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {successMessage}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-y-1 text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="pb-3 text-left font-semibold">Event</th>
                <th className="pb-3 text-left font-semibold">Status</th>
                <th className="pb-3 text-left font-semibold">Response</th>
                <th className="pb-3 text-left font-semibold">Attempts</th>
                <th className="pb-3 text-left font-semibold">Last attempt</th>
                <th className="pb-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="rounded-lg border border-dashed border-border/60 bg-muted/30 py-10 text-center text-sm text-muted-foreground"
                  >
                    No deliveries recorded yet.
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery) => {
                  const status = STATUS_COPY[delivery.status]
                  const expanded = expandedRows[delivery.id] ?? false

                  return (
                    <Fragment key={delivery.id}>
                      <tr className="rounded-lg border border-border/60 bg-card/60 align-top">
                        <td className="space-y-1 px-4 py-3">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <button
                              type="button"
                              onClick={() => toggleRow(delivery.id)}
                              className="flex size-6 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition hover:bg-background"
                              aria-expanded={expanded}
                              aria-controls={`delivery-${delivery.id}-details`}
                            >
                              {expanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                            <span>{delivery.eventType}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {resolveHost(delivery.targetUrl)}
                          </p>
                        </td>
                        <td className="space-y-1 px-4 py-3 align-top">
                          <Badge variant={status.badge}>{status.label}</Badge>
                          {delivery.pendingReplay ? (
                            <p className="text-xs text-muted-foreground">
                              Replay queued {formatTimestamp(delivery.lastReplayAt)}
                            </p>
                          ) : delivery.lastReplayAt ? (
                            <p className="text-xs text-muted-foreground">
                              Last replayed {formatTimestamp(delivery.lastReplayAt)}
                            </p>
                          ) : null}
                          {delivery.lastErrorMessage ? (
                            <p className="text-xs text-destructive">
                              {delivery.lastErrorMessage}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-sm">
                            {delivery.response.statusCode ?? "—"}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatLatency(delivery.response.latencyMs)}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-foreground">
                            {delivery.attemptCount}
                          </div>
                          {delivery.nextRetryAt ? (
                            <p className="text-xs text-muted-foreground">
                              Retry at {formatTimestamp(delivery.nextRetryAt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm text-foreground">
                            {formatTimestamp(delivery.lastAttemptAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {formatTimestamp(delivery.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleRow(delivery.id)}
                              className="justify-center"
                            >
                              {expanded ? "Hide payload" : "View payload"}
                            </Button>
                            <Button
                              size="sm"
                              disabled={isReplayDisabled(delivery)}
                              onClick={() => queueReplay(delivery.id)}
                              className="justify-center"
                            >
                              <RotateCw
                                className={cn(
                                  "mr-2 size-4",
                                  activeReplayId === delivery.id && "animate-spin"
                                )}
                              />
                              {delivery.pendingReplay
                                ? "Replay queued"
                                : activeReplayId === delivery.id
                                  ? "Queuing…"
                                  : "Replay"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td
                            id={`delivery-${delivery.id}-details`}
                            colSpan={6}
                            className="px-4 pb-4"
                          >
                            <PayloadPanel delivery={delivery} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

type PayloadPanelProps = {
  delivery: WebhookDeliveryRecord
}

function PayloadPanel({ delivery }: PayloadPanelProps) {
  const sanitizedRequest = useMemo(
    () => redactSensitiveValues(delivery.request),
    [delivery.request]
  )
  const sanitizedResponse = useMemo(
    () => redactSensitiveValues(delivery.response),
    [delivery.response]
  )

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Request</span>
              <span className="font-semibold text-foreground">
                {sanitizedRequest.method}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {delivery.request.url}
            </p>
          </div>
          <PayloadSection title="Headers" data={sanitizedRequest.headers} />
          <PayloadSection title="Payload" data={sanitizedRequest.payload} />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Response</span>
              <span className="font-semibold text-foreground">
                {sanitizedResponse.statusCode ?? "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {delivery.response.receivedAt
                ? `Received ${formatTimestamp(delivery.response.receivedAt)}`
                : "Awaiting response"}
            </p>
            <p className="text-xs text-muted-foreground">
              Duration: {formatLatency(delivery.response.latencyMs)}
            </p>
          </div>
          <PayloadSection title="Headers" data={sanitizedResponse.headers} />
          <PayloadSection title="Body" data={sanitizedResponse.body} />
        </div>
      </div>
    </div>
  )
}

type PayloadSectionProps = {
  title: string
  data: unknown
}

function PayloadSection({ title, data }: PayloadSectionProps) {
  const formatted = useMemo(() => formatJson(data), [data])

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ScrollArea className="max-h-56 rounded-lg border border-border/60 bg-background/80">
        <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-foreground/90">
          {formatted}
        </pre>
      </ScrollArea>
    </div>
  )
}
