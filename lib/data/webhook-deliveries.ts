import "server-only"

import { randomUUID } from "crypto"

export type WebhookDeliveryStatus = "delivered" | "failed" | "queued"

export type WebhookRequestRecord = {
  method: string
  url: string
  headers: Record<string, string>
  payload: Record<string, unknown>
}

export type WebhookResponseRecord = {
  statusCode: number | null
  headers: Record<string, string>
  body: unknown
  receivedAt: string | null
  latencyMs: number | null
}

export type WebhookDeliveryRecord = {
  id: string
  eventType: string
  status: WebhookDeliveryStatus
  createdAt: string
  lastAttemptAt: string
  nextRetryAt: string | null
  attemptCount: number
  durationMs: number | null
  targetUrl: string
  pendingReplay: boolean
  lastReplayAt: string | null
  lastReplayActor: string | null
  request: WebhookRequestRecord
  response: WebhookResponseRecord
  lastErrorMessage: string | null
}

export type WebhookReplayAuditStatus = "queued" | "completed" | "failed"

export type WebhookReplayAuditEntry = {
  id: string
  deliveryId: string
  actor: string
  triggeredAt: string
  targetUrl: string
  attemptNumber: number
  status: WebhookReplayAuditStatus
  message: string
  reason: string | null
}

export type RecordWebhookReplayInput = {
  deliveryId: string
  actor: string
  reason?: string | null
}

export type RecordWebhookReplayResult = {
  delivery: WebhookDeliveryRecord
  auditEntry: WebhookReplayAuditEntry
}

export type WebhookReplayErrorCode =
  | "DELIVERY_NOT_FOUND"
  | "REPLAY_ALREADY_PENDING"

export interface WebhookReplayError extends Error {
  code: WebhookReplayErrorCode
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

type InternalDelivery = WebhookDeliveryRecord

const deliveriesStore = new Map<string, InternalDelivery>()
const replayAuditLog: WebhookReplayAuditEntry[] = []

let seeded = false

const buildReplayError = (
  message: string,
  code: WebhookReplayErrorCode
): WebhookReplayError => {
  const error = new Error(message) as WebhookReplayError
  error.code = code
  return error
}

const seedData = () => {
  const now = new Date("2024-07-22T19:30:00.000Z")
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
  const dayAndHalfAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000)

  const seededDeliveries: InternalDelivery[] = [
    {
      id: "wh-del-1001",
      eventType: "rent.payment.succeeded",
      status: "delivered",
      createdAt: sixHoursAgo.toISOString(),
      lastAttemptAt: fifteenMinutesAgo.toISOString(),
      nextRetryAt: null,
      attemptCount: 1,
      durationMs: 684,
      targetUrl: "https://tenant-app.example.com/api/webhooks/stripe",
      pendingReplay: false,
      lastReplayAt: null,
      lastReplayActor: null,
      request: {
        method: "POST",
        url: "https://tenant-app.example.com/api/webhooks/stripe",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer whsec_test_demo_token_123456",
          "x-signature": "t=1721668200,v1=fe1e7d0192837465",
        },
        payload: {
          id: "evt_1PSomeThing",
          type: "rent.payment.succeeded",
          livemode: false,
          data: {
            object: {
              amount: 126000,
              currency: "usd",
              tenant_id: "tenant-1",
              card: {
                brand: "visa",
                last4: "4242",
                fingerprint: "Xt5EWLLDS7FJjR1c",
              },
              billing_details: {
                email: "roommate@example.com",
              },
            },
          },
        },
      },
      response: {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_abc123",
        },
        body: {
          ok: true,
          processedAt: fifteenMinutesAgo.toISOString(),
        },
        receivedAt: fifteenMinutesAgo.toISOString(),
        latencyMs: 240,
      },
      lastErrorMessage: null,
    },
    {
      id: "wh-del-1002",
      eventType: "maintenance.request.created",
      status: "failed",
      createdAt: twelveHoursAgo.toISOString(),
      lastAttemptAt: twoHoursAgo.toISOString(),
      nextRetryAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      attemptCount: 3,
      durationMs: 15432,
      targetUrl: "https://ops.partner.example.com/hooks/maintenance",
      pendingReplay: false,
      lastReplayAt: null,
      lastReplayActor: null,
      request: {
        method: "POST",
        url: "https://ops.partner.example.com/hooks/maintenance",
        headers: {
          "content-type": "application/json",
          "x-api-key": "pm_live_secret_00123456789",
          "x-request-retry": "2",
        },
        payload: {
          id: "maint-409",
          type: "maintenance.request.created",
          tenant: {
            id: "tenant-3",
            name: "Cameron Diaz",
            phone: "+1-555-0155",
          },
          details: {
            priority: "urgent",
            description: "Water heater is leaking",
            location: "Basement",
          },
          diagnostics: {
            attemptHistory: [500, 504],
            lastTimeoutMs: 15000,
          },
        },
      },
      response: {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: {
          error: "Tenant service timed out",
          retryable: true,
          correlation_id: "fail-789",
        },
        receivedAt: twoHoursAgo.toISOString(),
        latencyMs: 15000,
      },
      lastErrorMessage: "Tenant service timed out after 15s",
    },
    {
      id: "wh-del-1003",
      eventType: "documents.contract.signed",
      status: "delivered",
      createdAt: dayAndHalfAgo.toISOString(),
      lastAttemptAt: twoHoursAgo.toISOString(),
      nextRetryAt: null,
      attemptCount: 2,
      durationMs: 932,
      targetUrl: "https://compliance.example.com/api/hooks/documents",
      pendingReplay: true,
      lastReplayAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      lastReplayActor: "demo.admin",
      request: {
        method: "POST",
        url: "https://compliance.example.com/api/hooks/documents",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer doc_live_secret_99001",
          "x-trace-id": "trace-8822",
        },
        payload: {
          id: "doc-2024-07-lease",
          type: "documents.contract.signed",
          document: {
            name: "Lease Agreement 2024",
            unit: "3B",
            version: 3,
          },
          actors: [
            {
              id: "tenant-1",
              signature: "b3d82f1f90a3",
            },
            {
              id: "tenant-2",
              signature: "9ac2e7f184bc",
            },
          ],
        },
      },
      response: {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: {
          ok: true,
          archivedAt: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
        },
        receivedAt: twoHoursAgo.toISOString(),
        latencyMs: 320,
      },
      lastErrorMessage: null,
    },
  ]

  deliveriesStore.clear()
  for (const delivery of seededDeliveries) {
    deliveriesStore.set(delivery.id, delivery)
  }

  replayAuditLog.length = 0
  replayAuditLog.push(
    {
      id: "audit-0001",
      deliveryId: "wh-del-1003",
      actor: "system.auto-retry",
      triggeredAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
      targetUrl: "https://compliance.example.com/api/hooks/documents",
      attemptNumber: 2,
      status: "completed",
      message: "Automatic retry completed with 200 response.",
      reason: "scheduled_retry",
    },
    {
      id: "audit-0002",
      deliveryId: "wh-del-1002",
      actor: "demo.admin",
      triggeredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      targetUrl: "https://ops.partner.example.com/hooks/maintenance",
      attemptNumber: 3,
      status: "failed",
      message: "Manual replay returned 500 - Tenant service timed out.",
      reason: "investigate_timeout",
    }
  )
}

const ensureSeeded = () => {
  if (!seeded) {
    seedData()
    seeded = true
  }
}

const sortByDateDesc = <T extends { triggeredAt?: string; lastAttemptAt?: string }>(
  collection: T[],
  getDate: (item: T) => string | null | undefined
) =>
  [...collection].sort((a, b) => {
    const aDate = getDate(a)
    const bDate = getDate(b)
    const aTime = aDate ? new Date(aDate).getTime() : 0
    const bTime = bDate ? new Date(bDate).getTime() : 0
    return bTime - aTime
  })

export async function listWebhookDeliveries(): Promise<WebhookDeliveryRecord[]> {
  ensureSeeded()
  const deliveries = Array.from(deliveriesStore.values()).map((delivery) => clone(delivery))
  return sortByDateDesc(deliveries, (delivery) => delivery.lastAttemptAt)
}

export async function getWebhookReplayAuditLog(): Promise<WebhookReplayAuditEntry[]> {
  ensureSeeded()
  const entries = replayAuditLog.map((entry) => clone(entry))
  return sortByDateDesc(entries, (entry) => entry.triggeredAt)
}

export function recordWebhookReplay(
  input: RecordWebhookReplayInput
): RecordWebhookReplayResult {
  ensureSeeded()
  const delivery = deliveriesStore.get(input.deliveryId)

  if (!delivery) {
    throw buildReplayError("Delivery not found", "DELIVERY_NOT_FOUND")
  }

  if (delivery.pendingReplay) {
    throw buildReplayError(
      "Delivery already has a replay queued",
      "REPLAY_ALREADY_PENDING"
    )
  }

  const now = new Date()
  delivery.pendingReplay = true
  delivery.status = "queued"
  delivery.lastReplayActor = input.actor
  delivery.lastReplayAt = now.toISOString()
  delivery.nextRetryAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()
  delivery.attemptCount += 1
  delivery.lastAttemptAt = now.toISOString()

  const auditEntry: WebhookReplayAuditEntry = {
    id: randomUUID(),
    deliveryId: delivery.id,
    actor: input.actor,
    triggeredAt: now.toISOString(),
    targetUrl: delivery.targetUrl,
    attemptNumber: delivery.attemptCount,
    status: "queued",
    message: input.reason
      ? `Manual replay queued – ${input.reason}`
      : "Manual replay queued",
    reason: input.reason ?? null,
  }

  replayAuditLog.unshift(auditEntry)

  return {
    delivery: clone(delivery),
    auditEntry: clone(auditEntry),
  }
}

export function resetWebhookDeliveryState() {
  deliveriesStore.clear()
  replayAuditLog.length = 0
  seeded = false
  ensureSeeded()
}
