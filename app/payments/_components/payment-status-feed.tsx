"use client"

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  AUTOPAY_STATUS_BADGES,
  createRoommateAutopayState,
  describeAutopayStatus,
  deriveAutopayStatusFromStripeStatus,
  type RoommateAutopayState,
} from "@/lib/payments/status"
import { formatCurrency, roundToCurrency } from "@/lib/payments/currency"
import type { CatchUpBalance } from "@/types/payments"
import type { Tables } from "@/lib/supabase"
import { createBrowserClient } from "@/lib/supabase-client"

type StripePaymentStatus = Tables<"rent_payments">["status"]
type PaymentFeedStatus = StripePaymentStatus | "history"

interface PaymentStatusFeedProps {
  balances: CatchUpBalance[]
}

interface PaymentFeedEvent {
  id: string
  roommateId?: string | null
  roommateName: string
  stripeStatus: PaymentFeedStatus
  amount: number
  currency: string
  occurredAt: string
  description?: string | null
  category?: string | null
  isAutopay: boolean
}

const MAX_FEED_EVENTS = 20

function safeParseDate(value: string): string {
  try {
    const parsed = parseISO(value)
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString()
    }
    return parsed.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

function formatRelativeTime(isoDate: string): string {
  try {
    return formatDistanceToNow(parseISO(isoDate), { addSuffix: true })
  } catch (error) {
    return "just now"
  }
}

function getFeedStatusLabel(status: StripePaymentStatus, isAutopay: boolean): string {
  const prefix = isAutopay ? "Autopay" : "Payment"

  switch (status) {
    case "completed":
    case "succeeded":
      return `${prefix} succeeded`
    case "failed":
      return `${prefix} failed`
    case "cancelled":
      return `${prefix} cancelled`
    case "pending":
      return `${prefix} pending`
    default:
      return prefix
  }
}

function getFeedBadgeVariant(status: PaymentFeedStatus): "outline" | "secondary" | "complete" | "destructive" {
  if (status === "failed") {
    return "destructive"
  }
  if (status === "pending") {
    return "secondary"
  }
  if (status === "succeeded" || status === "completed") {
    return "complete"
  }
  return "outline"
}

export function PaymentStatusFeed({ balances }: PaymentStatusFeedProps) {
  const initialStatuses = useMemo<RoommateAutopayState[]>(
    () => createRoommateAutopayState(balances),
    [balances],
  )
  const [roommateStatuses, setRoommateStatuses] = useState<RoommateAutopayState[]>(
    initialStatuses,
  )

  const baseEvents = useMemo<PaymentFeedEvent[]>(() => {
    return initialStatuses.map((status) => ({
      id: `history-${status.roommateId}`,
      roommateId: status.roommateId,
      roommateName: status.roommateName,
      stripeStatus: "history" as const,
      amount: roundToCurrency(status.lastPaymentAmount),
      currency: status.currency,
      occurredAt: safeParseDate(status.lastPaymentDate),
      description: describeAutopayStatus(status.autopayStatus, status.autopayDay),
      category: undefined,
      isAutopay: status.autopayStatus === "active",
    }))
  }, [initialStatuses])

  const [events, setEvents] = useState<PaymentFeedEvent[]>(baseEvents)

  useEffect(() => {
    setRoommateStatuses(initialStatuses)
  }, [initialStatuses])

  useEffect(() => {
    setEvents(baseEvents)
  }, [baseEvents])

  const roommateLookup = useMemo(() => {
    const map = new Map<string, RoommateAutopayState>()
    for (const status of initialStatuses) {
      map.set(status.roommateId, status)
    }
    return map
  }, [initialStatuses])

  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return
    }

    const channel = supabase
      .channel("rent_payments_status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rent_payments" },
        (payload) => {
          const record = payload.new as Tables<"rent_payments"> | null
          if (!record) {
            return
          }

          const roommateId = record.tenant_id ?? undefined
          const hasSubscription = Boolean(record.stripe_subscription_id)
          const amount = roundToCurrency(record.amount ?? 0)
          const occurredAt = record.processed_at
            ? record.processed_at
            : record.created_at
              ? record.created_at
              : new Date().toISOString()

          if (roommateId) {
            setRoommateStatuses((current) =>
              current.map((status) => {
                if (status.roommateId !== roommateId) {
                  return status
                }

                const updatedStatus = deriveAutopayStatusFromStripeStatus(
                  status.autopayStatus,
                  record.status,
                  hasSubscription,
                )

                const shouldApplyPayment =
                  payload.eventType === "INSERT" &&
                  (record.status === "completed" || record.status === "succeeded")

                const nextOutstanding = shouldApplyPayment
                  ? Math.max(0, roundToCurrency(status.outstanding - amount))
                  : status.outstanding

                return {
                  ...status,
                  autopayStatus: updatedStatus,
                  outstanding: nextOutstanding,
                  lastPaymentAmount: shouldApplyPayment
                    ? amount
                    : status.lastPaymentAmount,
                  lastPaymentDate: shouldApplyPayment
                    ? occurredAt
                    : status.lastPaymentDate,
                }
              }),
            )
          }

          setEvents((current) => {
            const reference = roommateId
              ? roommateLookup.get(roommateId)
              : undefined

            const event: PaymentFeedEvent = {
              id: record.id ??
                record.stripe_payment_intent_id ??
                `event-${Date.now()}`,
              roommateId,
              roommateName: reference?.roommateName ?? "Roommate",
              stripeStatus: record.status,
              amount,
              currency: (record.currency ?? reference?.currency ?? "USD").toUpperCase(),
              occurredAt,
              description:
                record.description ||
                getFeedStatusLabel(record.status, hasSubscription),
              category:
                typeof record.metadata === "object" &&
                record.metadata !== null &&
                typeof (record.metadata as Record<string, unknown>).category === "string"
                  ? ((record.metadata as Record<string, unknown>).category as string)
                  : undefined,
              isAutopay: hasSubscription,
            }

            const nextEvents = [event, ...current]
            return nextEvents.slice(0, MAX_FEED_EVENTS)
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roommateLookup, supabase])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Realtime autopay feed</CardTitle>
        <CardDescription>
          Track Stripe autopay activity and roommate contributions as payments post.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {roommateStatuses.map((status) => {
            const lastPaymentLabel = (() => {
              try {
                return formatDistanceToNow(parseISO(status.lastPaymentDate), {
                  addSuffix: true,
                })
              } catch (error) {
                return status.lastPaymentDate
              }
            })()

            return (
              <div
                key={status.roommateId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{status.roommateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {status.unitLabel} · {describeAutopayStatus(status.autopayStatus, status.autopayDay)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last payment {lastPaymentLabel} · {formatCurrency(status.lastPaymentAmount, status.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={AUTOPAY_STATUS_BADGES[status.autopayStatus].variant}>
                    {AUTOPAY_STATUS_BADGES[status.autopayStatus].label}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Outstanding {formatCurrency(status.outstanding, status.currency)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Live status updates</h3>
            <span className="text-xs text-muted-foreground">Latest {events.length} events</span>
          </div>
          <ScrollArea className="h-64 rounded-lg border">
            <div className="space-y-3 p-4">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Stripe events will appear here the moment payments are processed.
                </p>
              ) : (
                events.map((event, index) => (
                  <div key={`${event.id}-${index}`} className="space-y-2 rounded-md border bg-background/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{event.roommateName}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.description ?? getFeedStatusLabel(
                            event.stripeStatus === "history" ? "completed" : event.stripeStatus,
                            event.isAutopay,
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getFeedBadgeVariant(event.stripeStatus)}>
                          {event.stripeStatus === "history"
                            ? "history"
                            : event.stripeStatus}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatCurrency(event.amount, event.currency)}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(event.occurredAt)}</span>
                      {event.category ? <span className="capitalize">{event.category}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
