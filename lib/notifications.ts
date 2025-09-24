"use server"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"

import type { Database, Json, Tables, TablesInsert } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"
import { Resend } from "resend"

export interface NotificationData {
  to: string | string[]
  subject: string
  template: string
  data?: Record<string, any>
  userId?: string
}

export interface InAppNotification {
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  actionUrl?: string
  metadata?: Record<string, any>
}

class NotificationService {
  private resend: Resend | null = null

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && apiKey !== "re_your_resend_api_key_here") {
      this.resend = new Resend(apiKey)
    }
  }

  async sendEmail(notification: NotificationData) {
    if (!this.resend) {
      console.warn(
        "Resend API key not configured. Skipping email notification."
      )
      return { success: false, error: "Email service not configured" }
    }

    try {
      const recipients = Array.isArray(notification.to)
        ? notification.to
        : [notification.to]

      const emailTemplates = {
        "visitor-booking": this.getVisitorBookingTemplate(notification.data),
        "maintenance-request": this.getMaintenanceRequestTemplate(
          notification.data
        ),
        "payment-receipt": this.getPaymentReceiptTemplate(notification.data),
        "document-signed": this.getDocumentSignedTemplate(notification.data),
        welcome: this.getWelcomeTemplate(notification.data),
      }

      const emailContent =
        emailTemplates[notification.template as keyof typeof emailTemplates]
      if (!emailContent) {
        throw new Error(`Email template '${notification.template}' not found`)
      }

      const { data, error } = await this.resend.emails.send({
        from: "Roomsily <notifications@roomsily.com>",
        to: recipients,
        subject: notification.subject,
        html: emailContent,
      })

      if (error) {
        console.error("Failed to send email:", error)
        return { success: false, error: error.message }
      }

      // Store email notification in database for tracking
      if (notification.userId) {
        await this.storeEmailNotification(notification)
      }

      return { success: true, data }
    } catch (error) {
      console.error("Email sending error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendInAppNotification(notification: InAppNotification) {
    try {
      const supabase = await createSupbaseServerClient()

      const { data, error } = await (supabase as any)
        .from("notifications")
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.actionUrl,
          metadata: notification.metadata,
          read: false,
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error("Failed to create in-app notification:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error("In-app notification error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendBulkNotification(
    notifications: (NotificationData | InAppNotification)[]
  ) {
    const results = await Promise.allSettled(
      notifications.map((notification) => {
        if ("to" in notification) {
          return this.sendEmail(notification)
        } else {
          return this.sendInAppNotification(notification)
        }
      })
    )

    return results.map((result, index) => ({
      index,
      success: result.status === "fulfilled" ? result.value.success : false,
      error: result.status === "rejected" ? result.reason : result.value.error,
    }))
  }

  private async storeEmailNotification(notification: NotificationData) {
    try {
      const supabase = await createSupbaseServerClient()

      await (supabase as any).from("email_notifications").insert({
        user_id: notification.userId,
        recipient: Array.isArray(notification.to)
          ? notification.to.join(", ")
          : notification.to,
        subject: notification.subject,
        template: notification.template,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to store email notification:", error)
    }
  }

  private getVisitorBookingTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Overnight Visitor Booking</h2>
        <p><strong>Guest:</strong> ${data?.guestName || "Unknown"}</p>
        <p><strong>Host:</strong> ${data?.hostName || "Unknown"}</p>
        <p><strong>Dates:</strong> ${data?.checkInDate || "Unknown"} to ${
      data?.checkOutDate || "Unknown"
    }</p>
        <p><strong>Purpose:</strong> ${data?.purpose || "Not specified"}</p>
        <p>Please review this booking request in the dashboard.</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a>
      </div>
    `
  }

  private getMaintenanceRequestTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Maintenance Request</h2>
        <p><strong>Requested by:</strong> ${
          data?.requesterName || "Unknown"
        }</p>
        <p><strong>Issue:</strong> ${data?.title || "Unknown"}</p>
        <p><strong>Description:</strong> ${
          data?.description || "No description provided"
        }</p>
        <p><strong>Priority:</strong> ${data?.priority || "Normal"}</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a>
      </div>
    `
  }

  private getPaymentReceiptTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Receipt</h2>
        <p><strong>Tenant:</strong> ${data?.tenantName || "Unknown"}</p>
        <p><strong>Amount:</strong> $${data?.amount || "0.00"}</p>
        <p><strong>Description:</strong> ${
          data?.description || "Rent payment"
        }</p>
        <p><strong>Date:</strong> ${
          data?.date || new Date().toLocaleDateString()
        }</p>
        <p>Thank you for your payment!</p>
      </div>
    `
  }

  private getDocumentSignedTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Signed</h2>
        <p><strong>Document:</strong> ${data?.documentTitle || "Unknown"}</p>
        <p><strong>Signed by:</strong> ${data?.signerName || "Unknown"}</p>
        <p><strong>Date:</strong> ${
          data?.signedAt || new Date().toLocaleDateString()
        }</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/documents" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a>
      </div>
    `
  }

  private getWelcomeTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Roomsily!</h2>
        <p>Hello ${data?.firstName || "there"}!</p>
        <p>Welcome to your Roomsily co-living hub. You can now:</p>
        <ul>
          <li>Manage your rent payments</li>
          <li>Book shared amenities</li>
          <li>Access important documents</li>
          <li>Communicate with roommates</li>
        </ul>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
      </div>
    `
  }
}

const notificationService = new NotificationService()

export async function sendEmailNotification(notification: NotificationData) {
  return notificationService.sendEmail(notification)
}

export async function sendInAppNotification(notification: InAppNotification) {
  return notificationService.sendInAppNotification(notification)
}

export async function sendBulkNotifications(
  notifications: (NotificationData | InAppNotification)[]
) {
  return notificationService.sendBulkNotification(notifications)
}

type WebhookSubscriptionRow = Tables<'webhook_subscriptions'>
type WebhookEventRow = Tables<'webhook_events'>
type WebhookDeliveryRow = Tables<'webhook_deliveries'>
type WebhookDeliveryAttemptRow = Tables<'webhook_delivery_attempts'>
type WebhookDeadLetterRow = Tables<'webhook_dead_letters'>

export type WebhookPayload = Json

export interface DeliveryWithRelations {
  delivery: WebhookDeliveryRow
  event: WebhookEventRow
  subscription: WebhookSubscriptionRow
}

interface WebhookEventInput {
  eventType: string
  payload: Json
  context?: Json | null
  createdBy?: string | null
  sourceReference?: string | null
}

interface DeliveryInsertInput {
  eventId: string
  subscriptionId: string
}

interface DeliveryAttemptLog {
  deliveryId: string
  attemptNumber: number
  status: 'succeeded' | 'failed'
  responseStatus: number | null
  errorMessage: string | null
  durationMs: number
  signature: string
  requestHeaders: Record<string, string>
  attemptedAt: Date
}

interface DeliverySuccessUpdate {
  attemptNumber: number
  responseStatus: number
  responseHeaders: Record<string, string> | null
  durationMs: number
  subscriptionId: string
  completedAt: Date
}

interface DeliveryRetryUpdate {
  attemptNumber: number
  nextAttemptAt: Date
  errorMessage: string
  responseStatus: number | null
  responseHeaders: Record<string, string> | null
  durationMs: number
  subscriptionId: string
  subscriptionFailureCount: number
  attemptedAt: Date
}

interface DeliveryFailureUpdate {
  attemptNumber: number
  errorMessage: string
  responseStatus: number | null
  responseHeaders: Record<string, string> | null
  durationMs: number
  subscriptionId: string
  subscriptionFailureCount: number
  attemptedAt: Date
}

interface DeadLetterInput {
  delivery: DeliveryWithRelations
  attemptNumber: number
  errorMessage: string
  responseStatus: number | null
  responseHeaders: Record<string, string> | null
  durationMs: number
  attemptedAt: Date
}

interface DeadLetterReplayUpdate {
  replayedAt: Date
  replayedBy?: string | null
  replayDeliveryId?: string | null
}

export interface WebhookStore {
  createEvent(input: WebhookEventInput): Promise<WebhookEventRow>
  getActiveSubscriptions(eventType: string): Promise<WebhookSubscriptionRow[]>
  createDeliveries(inputs: DeliveryInsertInput[]): Promise<WebhookDeliveryRow[]>
  fetchDueDeliveries(limit: number, now: Date): Promise<DeliveryWithRelations[]>
  markAsProcessing(deliveryId: string, now: Date): Promise<boolean>
  recordAttempt(log: DeliveryAttemptLog): Promise<WebhookDeliveryAttemptRow>
  markDeliverySucceeded(deliveryId: string, update: DeliverySuccessUpdate): Promise<void>
  scheduleRetry(deliveryId: string, update: DeliveryRetryUpdate): Promise<void>
  markDeliveryFailed(deliveryId: string, update: DeliveryFailureUpdate): Promise<void>
  createDeadLetter(input: DeadLetterInput): Promise<WebhookDeadLetterRow>
  getDeadLetter(id: string): Promise<WebhookDeadLetterRow | null>
  listDeadLetters(limit: number): Promise<WebhookDeadLetterRow[]>
  markDeadLetterReplayed(id: string, update: DeadLetterReplayUpdate): Promise<void>
  getSubscriptionById(id: string): Promise<WebhookSubscriptionRow | null>
}

const DEFAULT_BASE_RETRY_MS = 30_000
const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_JITTER_RATIO = 0.2

let cachedServiceRoleClient: SupabaseClient<Database> | null = null

function getServiceRoleClient() {
  if (cachedServiceRoleClient) {
    return cachedServiceRoleClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured')
  }

  cachedServiceRoleClient = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return cachedServiceRoleClient
}

function toJson(value: Record<string, string> | null | undefined): Json | null {
  if (!value) {
    return null
  }

  return value as unknown as Json
}

class SupabaseWebhookStore implements WebhookStore {
  constructor(private readonly client?: SupabaseClient<Database>) {}

  private get supabase() {
    return this.client ?? getServiceRoleClient()
  }

  async createEvent(input: WebhookEventInput) {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .insert({
        event_type: input.eventType,
        payload: input.payload,
        context: input.context ?? {},
        created_by: input.createdBy ?? null,
        source_reference: input.sourceReference ?? null,
      } satisfies TablesInsert<'webhook_events'>)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to create webhook event: ${error.message}`)
    }

    return data as WebhookEventRow
  }

  async getActiveSubscriptions(eventType: string) {
    const { data, error } = await this.supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('active', true)
      .contains('event_types', [eventType])

    if (error) {
      throw new Error(`Failed to load webhook subscriptions: ${error.message}`)
    }

    return (data ?? []) as WebhookSubscriptionRow[]
  }

  async createDeliveries(inputs: DeliveryInsertInput[]) {
    if (inputs.length === 0) {
      return []
    }

    const { data, error } = await this.supabase
      .from('webhook_deliveries')
      .insert(
        inputs.map((input) => ({
          event_id: input.eventId,
          subscription_id: input.subscriptionId,
          status: 'pending',
        })) satisfies TablesInsert<'webhook_deliveries'>[]
      )
      .select('*')

    if (error) {
      throw new Error(`Failed to queue webhook deliveries: ${error.message}`)
    }

    return (data ?? []) as WebhookDeliveryRow[]
  }

  async fetchDueDeliveries(limit: number, now: Date) {
    const nowIso = now.toISOString()

    const { data, error } = await this.supabase
      .from('webhook_deliveries')
      .select(
        `*,
        event:webhook_events(*),
        subscription:webhook_subscriptions(*)`
      )
      .in('status', ['pending', 'retrying'])
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .is('locked_at', null)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to load due webhook deliveries: ${error.message}`)
    }

    return (data ?? [])
      .map((row) => ({
        delivery: {
          id: row.id,
          event_id: row.event_id,
          subscription_id: row.subscription_id,
          status: row.status,
          attempt_count: row.attempt_count,
          next_attempt_at: row.next_attempt_at,
          locked_at: row.locked_at,
          last_error: row.last_error,
          response_status: row.response_status,
          response_headers: row.response_headers,
          duration_ms: row.duration_ms,
          completed_at: row.completed_at,
          metadata: row.metadata,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as WebhookDeliveryRow,
        event: row.event as WebhookEventRow,
        subscription: row.subscription as WebhookSubscriptionRow,
      }))
      .filter(
        (record): record is DeliveryWithRelations =>
          Boolean(record.event && record.subscription)
      )
  }

  async markAsProcessing(deliveryId: string, now: Date) {
    const { data, error } = await this.supabase
      .from('webhook_deliveries')
      .update({
        status: 'processing',
        locked_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', deliveryId)
      .in('status', ['pending', 'retrying'])
      .is('locked_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to lock webhook delivery ${deliveryId}: ${error.message}`)
    }

    return Boolean(data)
  }

  async recordAttempt(log: DeliveryAttemptLog) {
    const { data, error } = await this.supabase
      .from('webhook_delivery_attempts')
      .insert({
        delivery_id: log.deliveryId,
        attempt_number: log.attemptNumber,
        status: log.status,
        response_status: log.responseStatus,
        error_message: log.errorMessage,
        duration_ms: log.durationMs,
        signature: log.signature,
        request_headers: log.requestHeaders as unknown as Json,
        attempted_at: log.attemptedAt.toISOString(),
      } satisfies TablesInsert<'webhook_delivery_attempts'>)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to record webhook attempt: ${error.message}`)
    }

    return data as WebhookDeliveryAttemptRow
  }

  async markDeliverySucceeded(deliveryId: string, update: DeliverySuccessUpdate) {
    const timestamp = update.completedAt.toISOString()

    const { error } = await this.supabase
      .from('webhook_deliveries')
      .update({
        status: 'succeeded',
        attempt_count: update.attemptNumber,
        response_status: update.responseStatus,
        response_headers: toJson(update.responseHeaders),
        duration_ms: update.durationMs,
        completed_at: timestamp,
        next_attempt_at: null,
        last_error: null,
        locked_at: null,
        updated_at: timestamp,
      })
      .eq('id', deliveryId)

    if (error) {
      throw new Error(`Failed to mark webhook delivery ${deliveryId} successful: ${error.message}`)
    }

    const { error: subscriptionError } = await this.supabase
      .from('webhook_subscriptions')
      .update({
        failure_count: 0,
        last_delivered_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', update.subscriptionId)

    if (subscriptionError) {
      throw new Error(
        `Failed to update webhook subscription ${update.subscriptionId}: ${subscriptionError.message}`
      )
    }
  }

  async scheduleRetry(deliveryId: string, update: DeliveryRetryUpdate) {
    const attemptIso = update.attemptedAt.toISOString()
    const nextIso = update.nextAttemptAt.toISOString()

    const { error } = await this.supabase
      .from('webhook_deliveries')
      .update({
        status: 'retrying',
        attempt_count: update.attemptNumber,
        next_attempt_at: nextIso,
        last_error: update.errorMessage,
        response_status: update.responseStatus,
        response_headers: toJson(update.responseHeaders),
        duration_ms: update.durationMs,
        locked_at: null,
        updated_at: attemptIso,
      })
      .eq('id', deliveryId)

    if (error) {
      throw new Error(`Failed to reschedule webhook delivery ${deliveryId}: ${error.message}`)
    }

    const { error: subscriptionError } = await this.supabase
      .from('webhook_subscriptions')
      .update({
        failure_count: update.subscriptionFailureCount + 1,
        updated_at: attemptIso,
      })
      .eq('id', update.subscriptionId)

    if (subscriptionError) {
      throw new Error(
        `Failed to increment failure count for subscription ${update.subscriptionId}: ${subscriptionError.message}`
      )
    }
  }

  async markDeliveryFailed(deliveryId: string, update: DeliveryFailureUpdate) {
    const attemptIso = update.attemptedAt.toISOString()

    const { error } = await this.supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        attempt_count: update.attemptNumber,
        last_error: update.errorMessage,
        response_status: update.responseStatus,
        response_headers: toJson(update.responseHeaders),
        duration_ms: update.durationMs,
        locked_at: null,
        next_attempt_at: null,
        completed_at: attemptIso,
        updated_at: attemptIso,
      })
      .eq('id', deliveryId)

    if (error) {
      throw new Error(`Failed to mark webhook delivery ${deliveryId} failed: ${error.message}`)
    }

    const { error: subscriptionError } = await this.supabase
      .from('webhook_subscriptions')
      .update({
        failure_count: update.subscriptionFailureCount + 1,
        updated_at: attemptIso,
      })
      .eq('id', update.subscriptionId)

    if (subscriptionError) {
      throw new Error(
        `Failed to update subscription ${update.subscriptionId} after failure: ${subscriptionError.message}`
      )
    }
  }

  async createDeadLetter(input: DeadLetterInput) {
    const attemptedAtIso = input.attemptedAt.toISOString()

    const { data, error } = await this.supabase
      .from('webhook_dead_letters')
      .insert({
        event_id: input.delivery.event.id,
        subscription_id: input.delivery.subscription.id,
        delivery_id: input.delivery.delivery.id,
        event_type: input.delivery.event.event_type,
        payload: input.delivery.event.payload,
        context: input.delivery.event.context ?? {},
        subscription_name: input.delivery.subscription.name,
        target_url: input.delivery.subscription.target_url,
        last_error: input.errorMessage,
        response_status: input.responseStatus,
        attempt_count: input.attemptNumber,
        last_attempt_at: attemptedAtIso,
        metadata: input.delivery.delivery.metadata ?? {},
        failed_at: attemptedAtIso,
      } satisfies TablesInsert<'webhook_dead_letters'>)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to store webhook dead letter: ${error.message}`)
    }

    return data as WebhookDeadLetterRow
  }

  async getDeadLetter(id: string) {
    const { data, error } = await this.supabase
      .from('webhook_dead_letters')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load webhook dead letter ${id}: ${error.message}`)
    }

    return (data as WebhookDeadLetterRow) ?? null
  }

  async listDeadLetters(limit: number) {
    const { data, error } = await this.supabase
      .from('webhook_dead_letters')
      .select('*')
      .order('failed_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to list webhook dead letters: ${error.message}`)
    }

    return (data ?? []) as WebhookDeadLetterRow[]
  }

  async markDeadLetterReplayed(id: string, update: DeadLetterReplayUpdate) {
    const { error } = await this.supabase
      .from('webhook_dead_letters')
      .update({
        replayed_at: update.replayedAt.toISOString(),
        replayed_by: update.replayedBy ?? null,
        replay_delivery_id: update.replayDeliveryId ?? null,
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to mark dead letter ${id} as replayed: ${error.message}`)
    }
  }

  async getSubscriptionById(id: string) {
    const { data, error } = await this.supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load webhook subscription ${id}: ${error.message}`)
    }

    return (data as WebhookSubscriptionRow) ?? null
  }
}

export interface DispatchOptions {
  context?: Json | null
  createdBy?: string | null
  sourceReference?: string | null
  subscriptionIds?: string[]
}

export interface WebhookDispatcherOptions {
  store?: WebhookStore
  fetchImpl?: typeof fetch
  maxAttempts?: number
  baseRetryIntervalMs?: number
  jitterRatio?: number
}

export type DeliveryOutcome =
  | { deliveryId: string; status: 'succeeded'; responseStatus: number }
  | { deliveryId: string; status: 'retrying'; nextAttemptAt: Date }
  | { deliveryId: string; status: 'dead-lettered'; error: string }

export interface DispatchResult {
  event: WebhookEventRow
  deliveries: WebhookDeliveryRow[]
}

export interface ReplayResult {
  ok: boolean
  deadLetterId: string
  deliveryId?: string | null
  reason?:
    | 'not_found'
    | 'missing_subscription'
    | 'subscription_inactive'
    | 'enqueue_failed'
    | 'invalid_request'
  errorMessage?: string
}

export class WebhookDispatcher {
  private readonly store: WebhookStore
  private readonly fetchImpl: typeof fetch
  private readonly maxAttempts: number
  private readonly baseRetryIntervalMs: number
  private readonly jitterRatio: number

  constructor(options: WebhookDispatcherOptions = {}) {
    this.store = options.store ?? new SupabaseWebhookStore()
    this.fetchImpl = options.fetchImpl ?? fetch
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
    this.baseRetryIntervalMs = options.baseRetryIntervalMs ?? DEFAULT_BASE_RETRY_MS
    this.jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO
  }

  async dispatchEvent(
    eventType: string,
    payload: Json,
    options: DispatchOptions = {}
  ): Promise<DispatchResult> {
    const event = await this.store.createEvent({
      eventType,
      payload,
      context: options.context ?? {},
      createdBy: options.createdBy ?? null,
      sourceReference: options.sourceReference ?? null,
    })

    let subscriptions = await this.store.getActiveSubscriptions(eventType)

    if (options.subscriptionIds?.length) {
      const allowed = new Set(options.subscriptionIds)
      subscriptions = subscriptions.filter((subscription) =>
        allowed.has(subscription.id)
      )
    }

    const deliveries = await this.store.createDeliveries(
      subscriptions.map((subscription) => ({
        eventId: event.id,
        subscriptionId: subscription.id,
      }))
    )

    return { event, deliveries }
  }

  async processPendingDeliveries(options: { limit?: number; now?: Date } = {}) {
    const limit = options.limit ?? 10
    const now = options.now ?? new Date()
    const outcomes: DeliveryOutcome[] = []

    const dueDeliveries = await this.store.fetchDueDeliveries(limit, now)

    for (const details of dueDeliveries) {
      const attemptTimestamp = new Date(now)

      const locked = await this.store.markAsProcessing(
        details.delivery.id,
        attemptTimestamp
      )

      if (!locked) {
        continue
      }

      const attemptNumber = details.delivery.attempt_count + 1
      const bodyPayload = this.buildRequestBody(
        details,
        attemptNumber,
        attemptTimestamp.toISOString()
      )
      const body = JSON.stringify(bodyPayload)
      const signature = this.computeSignature(
        details.subscription.signing_secret,
        attemptTimestamp.toISOString(),
        body
      )

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RoomsilyWebhookDispatcher/1.0',
        'X-Roomsily-Event': details.event.event_type,
        'X-Roomsily-Delivery': details.delivery.id,
        'X-Roomsily-Subscription': details.subscription.id,
        'X-Roomsily-Timestamp': attemptTimestamp.toISOString(),
        'X-Roomsily-Attempt': String(attemptNumber),
        'X-Roomsily-Signature': signature,
      }

      let response: Response | null = null
      let errorMessage: string | null = null
      const start = Date.now()

      try {
        response = await this.fetchImpl(details.subscription.target_url, {
          method: 'POST',
          headers: requestHeaders,
          body,
        })

        if (!response.ok) {
          errorMessage = `HTTP ${response.status} ${response.statusText}`.trim()
        }
      } catch (error) {
        errorMessage =
          error instanceof Error ? error.message : 'Unknown delivery error'
      }

      const durationMs = Date.now() - start
      const responseHeaders = response
        ? Object.fromEntries(response.headers.entries())
        : null
      const responseStatus = response?.status ?? null

      await this.store.recordAttempt({
        deliveryId: details.delivery.id,
        attemptNumber,
        status: errorMessage ? 'failed' : 'succeeded',
        responseStatus,
        errorMessage,
        durationMs,
        signature,
        requestHeaders,
        attemptedAt: attemptTimestamp,
      })

      if (!errorMessage && response) {
        await this.store.markDeliverySucceeded(details.delivery.id, {
          attemptNumber,
          responseStatus: response.status,
          responseHeaders,
          durationMs,
          subscriptionId: details.subscription.id,
          completedAt: attemptTimestamp,
        })

        outcomes.push({
          deliveryId: details.delivery.id,
          status: 'succeeded',
          responseStatus: response.status,
        })

        continue
      }

      if (attemptNumber >= this.maxAttempts) {
        const finalError =
          errorMessage ?? 'Delivery failed after maximum retry attempts'

        await this.store.markDeliveryFailed(details.delivery.id, {
          attemptNumber,
          errorMessage: finalError,
          responseStatus,
          responseHeaders,
          durationMs,
          subscriptionId: details.subscription.id,
          subscriptionFailureCount: details.subscription.failure_count ?? 0,
          attemptedAt: attemptTimestamp,
        })

        await this.store.createDeadLetter({
          delivery: details,
          attemptNumber,
          errorMessage: finalError,
          responseStatus,
          responseHeaders,
          durationMs,
          attemptedAt: attemptTimestamp,
        })

        outcomes.push({
          deliveryId: details.delivery.id,
          status: 'dead-lettered',
          error: finalError,
        })

        continue
      }

      const nextAttemptAt = this.calculateNextAttempt(
        attemptTimestamp,
        attemptNumber
      )

      await this.store.scheduleRetry(details.delivery.id, {
        attemptNumber,
        nextAttemptAt,
        errorMessage: errorMessage ?? 'Unknown delivery error',
        responseStatus,
        responseHeaders,
        durationMs,
        subscriptionId: details.subscription.id,
        subscriptionFailureCount: details.subscription.failure_count ?? 0,
        attemptedAt: attemptTimestamp,
      })

      outcomes.push({
        deliveryId: details.delivery.id,
        status: 'retrying',
        nextAttemptAt,
      })
    }

    return outcomes
  }

  async listDeadLetters(limit = 50) {
    return this.store.listDeadLetters(limit)
  }

  async replayDeadLetter(
    deadLetterId: string,
    options: { triggeredBy?: string | null } = {}
  ): Promise<ReplayResult> {
    const deadLetter = await this.store.getDeadLetter(deadLetterId)

    if (!deadLetter) {
      return { ok: false, deadLetterId, reason: 'not_found' }
    }

    if (!deadLetter.subscription_id) {
      return { ok: false, deadLetterId, reason: 'missing_subscription' }
    }

    const subscription = await this.store.getSubscriptionById(
      deadLetter.subscription_id
    )

    if (!subscription || !subscription.active) {
      return { ok: false, deadLetterId, reason: 'subscription_inactive' }
    }

    try {
      const event = await this.store.createEvent({
        eventType: deadLetter.event_type,
        payload: deadLetter.payload,
        context: deadLetter.context ?? {},
        createdBy: options.triggeredBy ?? null,
        sourceReference: `dead-letter:${deadLetter.id}`,
      })

      const deliveries = await this.store.createDeliveries([
        { eventId: event.id, subscriptionId: subscription.id },
      ])

      const replayDelivery = deliveries[0] ?? null

      await this.store.markDeadLetterReplayed(deadLetter.id, {
        replayedAt: new Date(),
        replayedBy: options.triggeredBy ?? null,
        replayDeliveryId: replayDelivery?.id ?? null,
      })

      return {
        ok: true,
        deadLetterId,
        deliveryId: replayDelivery?.id ?? null,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to replay dead letter'
      return {
        ok: false,
        deadLetterId,
        reason: 'enqueue_failed',
        errorMessage,
      }
    }
  }

  private calculateNextAttempt(attemptedAt: Date, attemptNumber: number) {
    const baseDelay = this.baseRetryIntervalMs * Math.pow(2, attemptNumber - 1)
    const jitterWindow = baseDelay * this.jitterRatio
    const jitterOffset =
      jitterWindow === 0
        ? 0
        : (Math.random() * 2 - 1) * jitterWindow
    const delayMs = Math.max(
      this.baseRetryIntervalMs,
      Math.round(baseDelay + jitterOffset)
    )

    return new Date(attemptedAt.getTime() + delayMs)
  }

  private computeSignature(secret: string, timestamp: string, body: string) {
    return createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')
  }

  private buildRequestBody(
    details: DeliveryWithRelations,
    attempt: number,
    attemptedAt: string
  ) {
    return {
      id: details.event.id,
      type: details.event.event_type,
      createdAt: details.event.created_at,
      payload: details.event.payload,
      context: details.event.context ?? {},
      subscriptionId: details.subscription.id,
      deliveryId: details.delivery.id,
      attempt,
      attemptedAt,
    }
  }
}

export const webhookDispatcher = new WebhookDispatcher()
