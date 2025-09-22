"use server"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import webPush from "web-push"
import { Resend } from "resend"

import type { Database, Json } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

export interface NotificationData {
  to: string | string[]
  subject: string
  template: string
  data?: Record<string, unknown>
  userId?: string
}

export interface InAppNotification {
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface TextNotification {
  channel?: "sms"
  userId?: string
  phoneNumber?: string
  message: string
  mediaUrl?: string
  metadata?: Record<string, unknown>
}

export interface PushNotificationAction {
  action: string
  title: string
}

export type PushSubscriptionPayload = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface PushNotification {
  channel?: "push"
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  icon?: string
  actions?: PushNotificationAction[]
  subscription?: PushSubscriptionPayload
  metadata?: Record<string, unknown>
}

export type NotificationPayload =
  | NotificationData
  | InAppNotification
  | TextNotification
  | PushNotification

export interface NotificationResponse {
  success: boolean
  error?: string
  data?: unknown
  skipped?: boolean
}

type NotificationPreferences = {
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  smsPhoneNumber: string | null
  pushSubscription: PushSubscriptionPayload | null
}

type NotificationPreferencesRow =
  Database["public"]["Tables"]["notification_preferences"]["Row"]

type ProfilePhoneRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "phone"
>

type EmailStatus = "sent" | "failed" | "pending"
type SmsStatus = "sent" | "failed" | "skipped" | "queued"
type PushStatus = "sent" | "failed" | "skipped"

class NotificationService {
  private resend: Resend | null = null
  private twilioConfig:
    | {
        accountSid: string
        authToken: string
        fromNumber?: string
        messagingServiceSid?: string
      }
    | null = null
  private supabaseAdmin: SupabaseClient<Database> | null = null
  private preferencesCache = new Map<string, NotificationPreferences>()
  private webPushConfigured = false

  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey && resendApiKey !== "re_your_resend_api_key_here") {
      this.resend = new Resend(resendApiKey)
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    const fromNumber = process.env.TWILIO_FROM_NUMBER

    if (accountSid && authToken && (messagingServiceSid || fromNumber)) {
      this.twilioConfig = {
        accountSid,
        authToken,
        fromNumber: fromNumber || undefined,
        messagingServiceSid: messagingServiceSid || undefined,
      }
    }

    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
    const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL || "notifications@roomsily.com"

    if (publicKey && privateKey) {
      try {
        webPush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey)
        this.webPushConfigured = true
      } catch (error) {
        console.error("Failed to configure web push", error)
        this.webPushConfigured = false
      }
    }
  }

  private async getSupabaseClient(): Promise<SupabaseClient<Database>> {
    if (this.supabaseAdmin) {
      return this.supabaseAdmin
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (url && serviceRoleKey) {
      this.supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      return this.supabaseAdmin
    }

    return (await createSupbaseServerClient()) as SupabaseClient<Database>
  }

  private async getNotificationPreferences(userId: string) {
    if (this.preferencesCache.has(userId)) {
      return this.preferencesCache.get(userId)!
    }

    try {
      const supabase = await this.getSupabaseClient()
      const { data: preferenceRow, error: preferencesError } = await supabase
        .from("notification_preferences")
        .select(
          "email_enabled, sms_enabled, push_enabled, sms_phone_number, push_subscription"
        )
        .eq("user_id", userId)
        .maybeSingle<NotificationPreferencesRow>()

      if (preferencesError && preferencesError.code !== "PGRST116") {
        console.error("Failed to fetch notification preferences", preferencesError)
      }

      let smsPhoneNumber = preferenceRow?.sms_phone_number ?? null
      if (!smsPhoneNumber) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", userId)
          .maybeSingle<ProfilePhoneRow>()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Failed to fetch profile for notification preferences", profileError)
        }

        smsPhoneNumber = profile?.phone ?? null
      }

      const preferences: NotificationPreferences = {
        emailEnabled: preferenceRow?.email_enabled ?? true,
        smsEnabled: preferenceRow?.sms_enabled ?? false,
        pushEnabled: preferenceRow?.push_enabled ?? false,
        smsPhoneNumber,
        pushSubscription: (preferenceRow?.push_subscription as PushSubscriptionPayload | null) ?? null,
      }

      this.preferencesCache.set(userId, preferences)
      return preferences
    } catch (error) {
      console.error("Unable to resolve notification preferences", error)
      return {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        smsPhoneNumber: null,
        pushSubscription: null,
      }
    }
  }

  private async storeEmailNotification(
    notification: NotificationData,
    status: EmailStatus,
    errorMessage?: string | null
  ) {
    if (!notification.userId) return

    try {
      const supabase = await this.getSupabaseClient()
      await (supabase as any).from("email_notifications").insert({
        user_id: notification.userId,
        recipient: Array.isArray(notification.to)
          ? notification.to.join(", ")
          : notification.to,
        subject: notification.subject,
        template: notification.template,
        status,
        sent_at: new Date().toISOString(),
        error_message: errorMessage ?? null,
        metadata: notification.data as Json | null,
      })
    } catch (error) {
      console.error("Failed to store email notification:", error)
    }
  }

  private async storeSmsNotification(params: {
    userId?: string
    phoneNumber: string
    message: string
    status: SmsStatus
    providerMessageId?: string | null
    errorMessage?: string | null
    metadata?: Record<string, unknown>
  }) {
    try {
      const supabase = await this.getSupabaseClient()
      await (supabase as any).from("sms_notifications").insert({
        user_id: params.userId ?? null,
        phone_number: params.phoneNumber,
        message: params.message,
        status: params.status,
        provider_message_id: params.providerMessageId ?? null,
        error_message: params.errorMessage ?? null,
        metadata: (params.metadata ?? null) as Json | null,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to store SMS notification:", error)
    }
  }

  private async storePushNotification(params: {
    userId?: string
    endpoint: string
    payload: Record<string, unknown>
    status: PushStatus
    errorMessage?: string | null
    metadata?: Record<string, unknown>
  }) {
    try {
      const supabase = await this.getSupabaseClient()
      await (supabase as any).from("push_notifications").insert({
        user_id: params.userId ?? null,
        endpoint: params.endpoint,
        payload: params.payload as Json,
        status: params.status,
        error_message: params.errorMessage ?? null,
        metadata: (params.metadata ?? null) as Json | null,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to store push notification:", error)
    }
  }

  async sendEmail(notification: NotificationData): Promise<NotificationResponse> {
    if (!this.resend) {
      console.warn("Resend API key not configured. Skipping email notification.")
      return { success: false, error: "Email service not configured" }
    }

    try {
      if (notification.userId) {
        const preferences = await this.getNotificationPreferences(notification.userId)
        if (!preferences.emailEnabled) {
          await this.storeEmailNotification(
            notification,
            "pending",
            "Email channel disabled by user preferences"
          )
          return { success: true, skipped: true }
        }
      }

      const recipients = Array.isArray(notification.to)
        ? notification.to
        : [notification.to]

      const emailTemplates = {
        "visitor-booking": this.getVisitorBookingTemplate(notification.data),
        "maintenance-request": this.getMaintenanceRequestTemplate(notification.data),
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
        await this.storeEmailNotification(notification, "failed", error.message)
        console.error("Failed to send email:", error)
        return { success: false, error: error.message }
      }

      await this.storeEmailNotification(notification, "sent")
      return { success: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      if (notification.userId) {
        await this.storeEmailNotification(notification, "failed", message)
      }
      console.error("Email sending error:", error)
      return { success: false, error: message }
    }
  }

  async sendInAppNotification(notification: InAppNotification): Promise<NotificationResponse> {
    try {
      const supabase = await this.getSupabaseClient()

      const { data, error } = await (supabase as any)
        .from("notifications")
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.actionUrl,
          metadata: (notification.metadata ?? null) as Json | null,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error("Failed to create in-app notification:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("In-app notification error:", error)
      return { success: false, error: message }
    }
  }

  async sendTextNotification(notification: TextNotification): Promise<NotificationResponse> {
    if (!this.twilioConfig) {
      console.warn("Twilio credentials are not configured. Skipping SMS notification.")
      return { success: false, error: "Text message service not configured" }
    }

    let phoneNumber = notification.phoneNumber
    if (notification.userId) {
      const preferences = await this.getNotificationPreferences(notification.userId)
      if (!preferences.smsEnabled) {
        if (preferences.smsPhoneNumber) {
          await this.storeSmsNotification({
            userId: notification.userId,
            phoneNumber: preferences.smsPhoneNumber,
            message: notification.message,
            status: "skipped",
            errorMessage: "SMS channel disabled by user preferences",
            metadata: notification.metadata,
          })
        }
        return { success: true, skipped: true }
      }
      phoneNumber = phoneNumber ?? preferences.smsPhoneNumber ?? undefined
    }

    if (!phoneNumber) {
      console.warn("No phone number available for SMS notification")
      return { success: false, error: "Recipient phone number is missing" }
    }

    const body = new URLSearchParams({
      To: phoneNumber,
      Body: notification.message,
    })

    if (notification.mediaUrl) {
      body.append("MediaUrl", notification.mediaUrl)
    }

    if (this.twilioConfig.messagingServiceSid) {
      body.append("MessagingServiceSid", this.twilioConfig.messagingServiceSid)
    } else if (this.twilioConfig.fromNumber) {
      body.append("From", this.twilioConfig.fromNumber)
    } else {
      return { success: false, error: "No Twilio sender configured" }
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioConfig.accountSid}/Messages.json`

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.twilioConfig.accountSid}:${this.twilioConfig.authToken}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      })

      const payload = (await response.json().catch(() => null)) as
        | { sid?: string; message?: string; error_message?: string }
        | null

      if (!response.ok) {
        const errorMessage =
          payload?.message || payload?.error_message || "Failed to send SMS notification"
        await this.storeSmsNotification({
          userId: notification.userId,
          phoneNumber,
          message: notification.message,
          status: "failed",
          errorMessage,
          metadata: notification.metadata,
        })
        return { success: false, error: errorMessage }
      }

      await this.storeSmsNotification({
        userId: notification.userId,
        phoneNumber,
        message: notification.message,
        status: "sent",
        providerMessageId: payload?.sid ?? null,
        metadata: notification.metadata,
      })

      return { success: true, data: payload }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      await this.storeSmsNotification({
        userId: notification.userId,
        phoneNumber,
        message: notification.message,
        status: "failed",
        errorMessage: message,
        metadata: notification.metadata,
      })
      console.error("SMS notification error:", error)
      return { success: false, error: message }
    }
  }

  async sendPushNotification(notification: PushNotification): Promise<NotificationResponse> {
    if (!this.webPushConfigured) {
      console.warn("Web push keys are not configured. Skipping push notification.")
      return { success: false, error: "Push notification service not configured" }
    }

    const preferences = await this.getNotificationPreferences(notification.userId)
    if (!preferences.pushEnabled) {
      if (preferences.pushSubscription) {
        await this.storePushNotification({
          userId: notification.userId,
          endpoint: preferences.pushSubscription.endpoint,
          payload: {
            title: notification.title,
            body: notification.body,
            data: notification.data ?? null,
            icon: notification.icon ?? null,
            actions: notification.actions ?? null,
          },
          status: "skipped",
          errorMessage: "Push channel disabled by user preferences",
          metadata: notification.metadata,
        })
      }
      return { success: true, skipped: true }
    }

    const subscription = notification.subscription ?? preferences.pushSubscription
    if (!subscription) {
      console.warn("No push subscription available for user", notification.userId)
      return { success: false, error: "Missing push subscription" }
    }

    const payload = {
      title: notification.title,
      body: notification.body,
      data: notification.data ?? null,
      icon: notification.icon ?? null,
      actions: notification.actions ?? null,
    }

    try {
      const response = await webPush.sendNotification(subscription, JSON.stringify(payload))

      await this.storePushNotification({
        userId: notification.userId,
        endpoint: subscription.endpoint,
        payload,
        status: "sent",
        metadata: notification.metadata,
      })

      return { success: true, data: response }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      await this.storePushNotification({
        userId: notification.userId,
        endpoint: subscription.endpoint,
        payload,
        status: "failed",
        errorMessage: message,
        metadata: notification.metadata,
      })
      console.error("Push notification error:", error)
      return { success: false, error: message }
    }
  }

  async sendBulkNotification(notifications: NotificationPayload[]) {
    const results = await Promise.allSettled(
      notifications.map((notification) => {
        if ((notification as TextNotification).channel === "sms") {
          return this.sendTextNotification(notification as TextNotification)
        }

        if ((notification as PushNotification).channel === "push") {
          return this.sendPushNotification(notification as PushNotification)
        }

        if ("to" in notification) {
          return this.sendEmail(notification as NotificationData)
        }

        return this.sendInAppNotification(notification as InAppNotification)
      })
    )

    return results.map((result, index) => ({
      index,
      success: result.status === "fulfilled" ? result.value.success : false,
      error: result.status === "rejected" ? result.reason : result.value.error,
      skipped: result.status === "fulfilled" ? result.value.skipped ?? false : false,
    }))
  }

  private getVisitorBookingTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Overnight Visitor Booking</h2>
        <p><strong>Guest:</strong> ${data?.guestName || "Unknown"}</p>
        <p><strong>Host:</strong> ${data?.hostName || "Unknown"}</p>
        <p><strong>Dates:</strong> ${
          data?.checkInDate || "Unknown"
        } to ${data?.checkOutDate || "Unknown"}</p>
        <p><strong>Purpose:</strong> ${data?.purpose || "Not specified"}</p>
        <p>Please review this booking request in the dashboard.</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a>
      </div>
    `
  }

  private getMaintenanceRequestTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Maintenance Request</h2>
        <p><strong>Requested by:</strong> ${data?.requesterName || "Unknown"}</p>
        <p><strong>Issue:</strong> ${data?.title || "Unknown"}</p>
        <p><strong>Description:</strong> ${data?.description || "No description provided"}</p>
        <p><strong>Priority:</strong> ${data?.priority || "Normal"}</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a>
      </div>
    `
  }

  private getPaymentReceiptTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Receipt</h2>
        <p><strong>Tenant:</strong> ${data?.tenantName || "Unknown"}</p>
        <p><strong>Amount:</strong> $${data?.amount || "0.00"}</p>
        <p><strong>Description:</strong> ${data?.description || "Rent payment"}</p>
        <p><strong>Date:</strong> ${data?.date || new Date().toLocaleDateString()}</p>
        <p>Thank you for your payment!</p>
      </div>
    `
  }

  private getDocumentSignedTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Signed</h2>
        <p><strong>Document:</strong> ${data?.documentTitle || "Unknown"}</p>
        <p><strong>Signed by:</strong> ${data?.signerName || "Unknown"}</p>
        <p><strong>Date:</strong> ${data?.signedAt || new Date().toLocaleDateString()}</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/documents" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a>
      </div>
    `
  }

  private getWelcomeTemplate(data?: Record<string, unknown>) {
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

export async function sendTextNotification(notification: TextNotification) {
  return notificationService.sendTextNotification(notification)
}

export async function sendPushNotification(notification: PushNotification) {
  return notificationService.sendPushNotification(notification)
}

export async function sendBulkNotifications(notifications: NotificationPayload[]) {
  return notificationService.sendBulkNotification(notifications)
}
