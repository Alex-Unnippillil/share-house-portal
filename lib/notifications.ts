"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupbaseServerClient } from "@/utils/supaone"
import { Resend } from "resend"
import type { Database } from "@/lib/supabase"

export interface NotificationData {
  to: string | string[]
  subject: string
  template: string
  data?: Record<string, any>
  userId?: string
}

export interface ScheduledNotification extends NotificationData {
  sendAt: string
  metadata?: Record<string, any>
}

export interface InAppNotification {
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface DunningStage {
  id: string
  offsetHours: number
  subject: string
  template: string
  retry?: boolean
  attempt?: number
}

export interface ScheduleDunningCadenceInput {
  userId?: string
  email?: string
  tenantName?: string
  amount: number
  currency: string
  paymentReference: string
  failedAt: string
  nextPaymentAttempt?: string
  supabaseClient?: SupabaseClient<Database>
  cadence?: DunningStage[]
  totalAttempts?: number
}

export interface ScheduledDunningPlan {
  notifications: Array<{
    stageId: string
    sendAt: string
    subject: string
    template: string
    scheduled: boolean
  }>
  retrySchedule: string[]
}

const DEFAULT_DUNNING_CADENCE: DunningStage[] = [
  {
    id: "retry_1",
    offsetHours: 24,
    subject: "We'll retry your rent payment",
    template: "payment-retry",
    retry: true,
    attempt: 1,
  },
  {
    id: "retry_2",
    offsetHours: 72,
    subject: "Second rent payment retry scheduled",
    template: "payment-retry",
    retry: true,
    attempt: 2,
  },
  {
    id: "final_notice",
    offsetHours: 168,
    subject: "Final notice: rent payment overdue",
    template: "payment-final-notice",
  },
]

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
        "payment-failed": this.getPaymentFailedTemplate(notification.data),
        "payment-retry": this.getPaymentRetryTemplate(notification.data),
        "payment-final-notice": this.getPaymentFinalNoticeTemplate(
          notification.data
        ),
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

  async scheduleEmail(
    notification: ScheduledNotification,
    supabaseOverride?: SupabaseClient<Database>
  ) {
    try {
      const supabase =
        supabaseOverride ?? ((await createSupbaseServerClient()) as any)

      const recipient = Array.isArray(notification.to)
        ? notification.to.join(", ")
        : notification.to

      const { error } = await (supabase as SupabaseClient<Database>)
        .from("email_notifications")
        .insert({
          user_id: notification.userId ?? null,
          recipient,
          subject: notification.subject,
          template: notification.template,
          status: "pending",
          sent_at: notification.sendAt,
          metadata: {
            ...(notification.metadata ?? {}),
            data: notification.data,
          },
        })

      if (error) {
        console.error("Failed to schedule email notification:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error("Failed to schedule email notification:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
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

  private getPaymentFailedTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Action needed: rent payment failed</h2>
        <p>Hello ${data?.tenantName || "there"},</p>
        <p>We attempted to charge your rent payment for <strong>${
          data?.amount || "your unit"
        }</strong> but the payment was declined.</p>
        <p><strong>Reason:</strong> ${
          data?.failureReason || "The payment could not be completed"
        }</p>
        ${
          data?.nextAttempt
            ? `<p>We'll automatically retry this payment on <strong>${data.nextAttempt}</strong>.</p>`
            : ""
        }
        <p>Please update your payment method or reach out to your bank to ensure the retry succeeds.</p>
        <p>If you've already resolved the issue you can ignore this message.</p>
      </div>
    `
  }

  private getPaymentRetryTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Upcoming rent payment retry</h2>
        <p>Hello ${data?.tenantName || "there"},</p>
        <p>This is a reminder that we'll retry your rent payment for <strong>${
          data?.amount || "your unit"
        }</strong> on <strong>${data?.retryDate || "the scheduled date"}</strong>.</p>
        <p>Attempt ${data?.attempt || 1} of ${data?.totalAttempts || 3}.</p>
        <p>If your payment details have changed, please update them before the retry to avoid further issues.</p>
      </div>
    `
  }

  private getPaymentFinalNoticeTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Final notice: rent payment still outstanding</h2>
        <p>Hello ${data?.tenantName || "there"},</p>
        <p>Your rent payment for <strong>${
          data?.amount || "your unit"
        }</strong> remains unpaid after multiple attempts.</p>
        <p>Please update your payment method or contact the property team immediately to prevent escalation.</p>
        <p>If you believe this is a mistake, reply to this email and we'll help resolve it.</p>
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

export async function scheduleEmailNotification(
  notification: ScheduledNotification,
  supabaseClient?: SupabaseClient<Database>
) {
  return notificationService.scheduleEmail(notification, supabaseClient)
}

export async function sendBulkNotifications(
  notifications: (NotificationData | InAppNotification)[]
) {
  return notificationService.sendBulkNotification(notifications)
}

export async function scheduleDunningCadence(
  input: ScheduleDunningCadenceInput
): Promise<ScheduledDunningPlan> {
  const plan: ScheduledDunningPlan = {
    notifications: [],
    retrySchedule: [],
  }

  if (!input.email) {
    return plan
  }

  let supabase = input.supabaseClient
  if (!supabase) {
    try {
      supabase = (await createSupbaseServerClient()) as unknown as SupabaseClient<Database>
    } catch (error) {
      console.error("Unable to create Supabase client for dunning cadence:", error)
      return plan
    }
  }

  const cadence = input.cadence ?? DEFAULT_DUNNING_CADENCE
  const failedAtDate = new Date(input.failedAt)
  const failureTimestamp = Number.isNaN(failedAtDate.getTime())
    ? new Date()
    : failedAtDate

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.currency,
  })
  const formattedAmount = formatter.format(input.amount)
  const defaultRetryCount = cadence.filter((stage) => stage.retry).length
  const totalAttempts =
    input.totalAttempts ?? (defaultRetryCount > 0 ? defaultRetryCount : 3)

  for (const stage of cadence) {
    let sendAtDate = new Date(
      failureTimestamp.getTime() + stage.offsetHours * 60 * 60 * 1000
    )

    if (stage.retry && stage.attempt === 1 && input.nextPaymentAttempt) {
      const nextAttemptDate = new Date(input.nextPaymentAttempt)
      if (!Number.isNaN(nextAttemptDate.getTime())) {
        sendAtDate = nextAttemptDate
      }
    }

    const sendAtIso = sendAtDate.toISOString()

    const scheduleResult = await notificationService.scheduleEmail(
      {
        to: input.email,
        userId: input.userId,
        subject: stage.subject,
        template: stage.template,
        data: {
          tenantName: input.tenantName,
          amount: formattedAmount,
          retryDate: sendAtDate.toLocaleString(),
          attempt: stage.attempt,
          totalAttempts,
        },
        metadata: {
          stageId: stage.id,
          attempt: stage.attempt,
          retry: stage.retry ?? false,
          paymentReference: input.paymentReference,
        },
        sendAt: sendAtIso,
      },
      supabase as SupabaseClient<Database>
    )

    const scheduled = scheduleResult.success

    plan.notifications.push({
      stageId: stage.id,
      sendAt: sendAtIso,
      subject: stage.subject,
      template: stage.template,
      scheduled,
    })

    if (stage.retry) {
      plan.retrySchedule.push(sendAtIso)
    }
  }

  return plan
}
