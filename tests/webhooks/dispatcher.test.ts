import { createHmac, randomUUID } from "node:crypto"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  WebhookDispatcher,
  type DeliveryOutcome,
  type WebhookStore,
} from "@/lib/notifications"
import type { Json, Tables } from "@/lib/supabase"

type WebhookSubscriptionRow = Tables<'webhook_subscriptions'>
type WebhookEventRow = Tables<'webhook_events'>
type WebhookDeliveryRow = Tables<'webhook_deliveries'>
type WebhookDeliveryAttemptRow = Tables<'webhook_delivery_attempts'>
type WebhookDeadLetterRow = Tables<'webhook_dead_letters'>

type DeliveryWithRelations = Parameters<WebhookStore['createDeadLetter']>[0]['delivery']

class InMemoryWebhookStore implements WebhookStore {
  subscriptions: WebhookSubscriptionRow[] = []
  events: WebhookEventRow[] = []
  deliveries: WebhookDeliveryRow[] = []
  attempts: WebhookDeliveryAttemptRow[] = []
  deadLetters: WebhookDeadLetterRow[] = []

  addSubscription(
    input: Pick<
      WebhookSubscriptionRow,
      'event_types' | 'signing_secret' | 'target_url'
    > &
      Partial<WebhookSubscriptionRow>
  ) {
    const nowIso = new Date().toISOString()
    const subscription: WebhookSubscriptionRow = {
      id: input.id ?? randomUUID(),
      created_at: input.created_at ?? nowIso,
      updated_at: input.updated_at ?? nowIso,
      name: input.name ?? 'Test subscription',
      description: input.description ?? null,
      target_url: input.target_url,
      signing_secret: input.signing_secret,
      event_types: input.event_types,
      active: input.active ?? true,
      created_by: input.created_by ?? null,
      last_delivered_at: input.last_delivered_at ?? null,
      failure_count: input.failure_count ?? 0,
      metadata: input.metadata ?? ({} as Json),
    }

    this.subscriptions.push(subscription)
    return subscription
  }

  async createEvent(input: {
    eventType: string
    payload: Json
    context?: Json | null
    createdBy?: string | null
    sourceReference?: string | null
  }) {
    const nowIso = new Date().toISOString()
    const event: WebhookEventRow = {
      id: randomUUID(),
      created_at: nowIso,
      event_type: input.eventType,
      payload: input.payload,
      context: input.context ?? ({} as Json),
      created_by: input.createdBy ?? null,
      source_reference: input.sourceReference ?? null,
    }

    this.events.push(event)
    return event
  }

  async getActiveSubscriptions(eventType: string) {
    return this.subscriptions.filter(
      (subscription) =>
        subscription.active && subscription.event_types.includes(eventType)
    )
  }

  async createDeliveries(inputs: Array<{ eventId: string; subscriptionId: string }>) {
    const nowIso = new Date().toISOString()
    const created: WebhookDeliveryRow[] = inputs.map((input) => {
      const delivery: WebhookDeliveryRow = {
        id: randomUUID(),
        event_id: input.eventId,
        subscription_id: input.subscriptionId,
        status: 'pending',
        attempt_count: 0,
        next_attempt_at: null,
        locked_at: null,
        last_error: null,
        response_status: null,
        response_headers: null,
        duration_ms: null,
        completed_at: null,
        metadata: {} as Json,
        created_at: nowIso,
        updated_at: nowIso,
      }

      this.deliveries.push(delivery)
      return delivery
    })

    return created
  }

  async fetchDueDeliveries(limit: number, now: Date) {
    const due = this.deliveries
      .filter((delivery) => {
        if (!['pending', 'retrying'].includes(delivery.status)) {
          return false
        }

        if (delivery.locked_at) {
          return false
        }

        if (!delivery.next_attempt_at) {
          return true
        }

        return new Date(delivery.next_attempt_at) <= now
      })
      .slice(0, limit)

    return due
      .map((delivery) => {
        const event = this.events.find((item) => item.id === delivery.event_id)
        const subscription = this.subscriptions.find(
          (item) => item.id === delivery.subscription_id
        )

        if (!event || !subscription) {
          return null
        }

        return {
          delivery,
          event,
          subscription,
        } satisfies DeliveryWithRelations
      })
      .filter((value): value is DeliveryWithRelations => Boolean(value))
  }

  async markAsProcessing(deliveryId: string, now: Date) {
    const delivery = this.deliveries.find((item) => item.id === deliveryId)

    if (!delivery) {
      return false
    }

    if (!['pending', 'retrying'].includes(delivery.status) || delivery.locked_at) {
      return false
    }

    delivery.status = 'processing'
    delivery.locked_at = now.toISOString()
    delivery.updated_at = delivery.locked_at

    return true
  }

  async recordAttempt(log: Parameters<WebhookStore['recordAttempt']>[0]) {
    const attempt: WebhookDeliveryAttemptRow = {
      id: randomUUID(),
      delivery_id: log.deliveryId,
      attempt_number: log.attemptNumber,
      status: log.status,
      attempted_at: log.attemptedAt.toISOString(),
      response_status: log.responseStatus,
      error_message: log.errorMessage,
      duration_ms: log.durationMs,
      signature: log.signature,
      request_headers: log.requestHeaders as unknown as Json,
      created_at: log.attemptedAt.toISOString(),
    }

    this.attempts.push(attempt)
    return attempt
  }

  async markDeliverySucceeded(
    deliveryId: string,
    update: Parameters<WebhookStore['markDeliverySucceeded']>[1]
  ) {
    const delivery = this.deliveries.find((item) => item.id === deliveryId)
    const subscription = this.subscriptions.find(
      (item) => item.id === update.subscriptionId
    )

    if (!delivery || !subscription) {
      throw new Error('Missing delivery or subscription')
    }

    delivery.status = 'succeeded'
    delivery.attempt_count = update.attemptNumber
    delivery.response_status = update.responseStatus
    delivery.response_headers = update.responseHeaders as unknown as Json
    delivery.duration_ms = update.durationMs
    delivery.completed_at = update.completedAt.toISOString()
    delivery.next_attempt_at = null
    delivery.last_error = null
    delivery.locked_at = null
    delivery.updated_at = update.completedAt.toISOString()

    subscription.failure_count = 0
    subscription.last_delivered_at = update.completedAt.toISOString()
    subscription.updated_at = update.completedAt.toISOString()
  }

  async scheduleRetry(
    deliveryId: string,
    update: Parameters<WebhookStore['scheduleRetry']>[1]
  ) {
    const delivery = this.deliveries.find((item) => item.id === deliveryId)
    const subscription = this.subscriptions.find(
      (item) => item.id === update.subscriptionId
    )

    if (!delivery || !subscription) {
      throw new Error('Missing delivery or subscription')
    }

    delivery.status = 'retrying'
    delivery.attempt_count = update.attemptNumber
    delivery.next_attempt_at = update.nextAttemptAt.toISOString()
    delivery.last_error = update.errorMessage
    delivery.response_status = update.responseStatus
    delivery.response_headers = update.responseHeaders as unknown as Json
    delivery.duration_ms = update.durationMs
    delivery.locked_at = null
    delivery.updated_at = update.attemptedAt.toISOString()

    subscription.failure_count = update.subscriptionFailureCount + 1
    subscription.updated_at = update.attemptedAt.toISOString()
  }

  async markDeliveryFailed(
    deliveryId: string,
    update: Parameters<WebhookStore['markDeliveryFailed']>[1]
  ) {
    const delivery = this.deliveries.find((item) => item.id === deliveryId)
    const subscription = this.subscriptions.find(
      (item) => item.id === update.subscriptionId
    )

    if (!delivery || !subscription) {
      throw new Error('Missing delivery or subscription')
    }

    delivery.status = 'failed'
    delivery.attempt_count = update.attemptNumber
    delivery.last_error = update.errorMessage
    delivery.response_status = update.responseStatus
    delivery.response_headers = update.responseHeaders as unknown as Json
    delivery.duration_ms = update.durationMs
    delivery.next_attempt_at = null
    delivery.locked_at = null
    delivery.completed_at = update.attemptedAt.toISOString()
    delivery.updated_at = update.attemptedAt.toISOString()

    subscription.failure_count = update.subscriptionFailureCount + 1
    subscription.updated_at = update.attemptedAt.toISOString()
  }

  async createDeadLetter(input: Parameters<WebhookStore['createDeadLetter']>[0]) {
    const failedAtIso = input.attemptedAt.toISOString()

    const record: WebhookDeadLetterRow = {
      id: randomUUID(),
      event_id: input.delivery.event.id,
      subscription_id: input.delivery.subscription.id,
      delivery_id: input.delivery.delivery.id,
      failed_at: failedAtIso,
      event_type: input.delivery.event.event_type,
      payload: input.delivery.event.payload,
      context: input.delivery.event.context ?? ({} as Json),
      subscription_name: input.delivery.subscription.name,
      target_url: input.delivery.subscription.target_url,
      last_error: input.errorMessage,
      response_status: input.responseStatus,
      attempt_count: input.attemptNumber,
      last_attempt_at: failedAtIso,
      metadata: input.delivery.delivery.metadata ?? ({} as Json),
      replayed_at: null,
      replayed_by: null,
      replay_delivery_id: null,
    }

    this.deadLetters.push(record)
    return record
  }

  async getDeadLetter(id: string) {
    return this.deadLetters.find((record) => record.id === id) ?? null
  }

  async listDeadLetters(limit: number) {
    return [...this.deadLetters]
      .sort((a, b) => {
        const aTime = a.failed_at ? new Date(a.failed_at).getTime() : 0
        const bTime = b.failed_at ? new Date(b.failed_at).getTime() : 0
        return bTime - aTime
      })
      .slice(0, limit)
  }

  async markDeadLetterReplayed(
    id: string,
    update: Parameters<WebhookStore['markDeadLetterReplayed']>[1]
  ) {
    const record = this.deadLetters.find((item) => item.id === id)

    if (!record) {
      throw new Error('Missing dead letter record')
    }

    record.replayed_at = update.replayedAt.toISOString()
    record.replayed_by = update.replayedBy ?? null
    record.replay_delivery_id = update.replayDeliveryId ?? null
  }

  async getSubscriptionById(id: string) {
    return this.subscriptions.find((subscription) => subscription.id === id) ?? null
  }
}

describe('WebhookDispatcher retry pipeline', () => {
  let store: InMemoryWebhookStore
  let fetchMock: ReturnType<typeof vi.fn>
  let dispatcher: WebhookDispatcher
  let subscription: WebhookSubscriptionRow

  beforeEach(() => {
    store = new InMemoryWebhookStore()
    subscription = store.addSubscription({
      event_types: ['tenant.updated'],
      signing_secret: 'secret-key',
      target_url: 'https://example.com/webhooks',
    })

    fetchMock = vi.fn()
    dispatcher = new WebhookDispatcher({
      store,
      fetchImpl: fetchMock as unknown as typeof fetch,
      maxAttempts: 3,
      baseRetryIntervalMs: 1000,
      jitterRatio: 0,
    })
  })

  it('queues deliveries and schedules exponential backoff on failure', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('error', { status: 500, statusText: 'Failure' })
    )

    const { deliveries } = await dispatcher.dispatchEvent('tenant.updated', {
      tenantId: 'tenant-1',
    } as Json)

    expect(deliveries).toHaveLength(1)

    const now = new Date('2024-01-01T00:00:00.000Z')
    const outcomes = await dispatcher.processPendingDeliveries({ now })

    expect(outcomes).toHaveLength(1)
    const outcome = outcomes[0] as Extract<DeliveryOutcome, { status: 'retrying' }>
    expect(outcome.status).toBe('retrying')
    expect(outcome.nextAttemptAt.toISOString()).toBe('2024-01-01T00:00:01.000Z')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(subscription.target_url)

    const headers = new Headers(init?.headers as HeadersInit)
    expect(headers.get('X-Roomsily-Event')).toBe('tenant.updated')
    expect(headers.get('X-Roomsily-Delivery')).toBe(deliveries[0].id)

    const timestamp = headers.get('X-Roomsily-Timestamp')
    const signature = headers.get('X-Roomsily-Signature')
    expect(timestamp).toBeTruthy()
    expect(signature).toBeTruthy()

    const body = init?.body as string
    expect(body).toBeTruthy()
    expect(signature).toBe(
      createHmac('sha256', subscription.signing_secret)
        .update(`${timestamp}.${body}`)
        .digest('hex')
    )

    const deliveryRecord = store.deliveries.find(
      (delivery) => delivery.id === deliveries[0].id
    )

    expect(deliveryRecord?.status).toBe('retrying')
    expect(deliveryRecord?.next_attempt_at).toBe('2024-01-01T00:00:01.000Z')
    expect(store.attempts).toHaveLength(1)
    expect(store.attempts[0].status).toBe('failed')
  })

  it('moves exhausted deliveries into the dead letter queue', async () => {
    fetchMock.mockResolvedValue(
      new Response('error', { status: 502, statusText: 'Upstream failure' })
    )

    const { deliveries } = await dispatcher.dispatchEvent('tenant.updated', {
      tenantId: 'tenant-1',
    } as Json)

    const attemptTimes = [
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-01-01T00:00:01.000Z'),
      new Date('2024-01-01T00:00:03.000Z'),
    ]

    let lastOutcomes: DeliveryOutcome[] = []
    for (const time of attemptTimes) {
      lastOutcomes = await dispatcher.processPendingDeliveries({ now: time })
    }

    const deliveryId = deliveries[0].id
    const deliveryRecord = store.deliveries.find((item) => item.id === deliveryId)

    expect(deliveryRecord?.status).toBe('failed')
    expect(store.deadLetters).toHaveLength(1)
    expect(store.deadLetters[0].attempt_count).toBe(3)
    expect(store.deadLetters[0].delivery_id).toBe(deliveryId)

    const lastOutcome = lastOutcomes.at(-1) as Extract<
      DeliveryOutcome,
      { status: 'dead-lettered' }
    >
    expect(lastOutcome.status).toBe('dead-lettered')
    expect(lastOutcome.error).toContain('HTTP 502')
  })

  it('replays a dead letter by enqueuing a fresh delivery', async () => {
    fetchMock.mockResolvedValue(
      new Response('error', { status: 503, statusText: 'Service unavailable' })
    )

    const { deliveries } = await dispatcher.dispatchEvent('tenant.updated', {
      tenantId: 'tenant-1',
    } as Json)

    const attemptTimes = [
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-01-01T00:00:01.000Z'),
      new Date('2024-01-01T00:00:03.000Z'),
    ]

    for (const time of attemptTimes) {
      await dispatcher.processPendingDeliveries({ now: time })
    }

    const deadLetter = store.deadLetters[0]
    expect(deadLetter).toBeTruthy()

    const replay = await dispatcher.replayDeadLetter(deadLetter.id, {
      triggeredBy: 'user-123',
    })

    expect(replay.ok).toBe(true)
    expect(replay.deadLetterId).toBe(deadLetter.id)
    expect(store.deadLetters[0].replayed_at).toBeTruthy()
    expect(store.deadLetters[0].replayed_by).toBe('user-123')

    const pendingDeliveries = store.deliveries.filter(
      (delivery) => delivery.status === 'pending'
    )

    expect(pendingDeliveries).toHaveLength(1)
    expect(pendingDeliveries[0].event_id).not.toBe(deliveries[0].event_id)
    expect(store.events).toHaveLength(2)
  })
})
