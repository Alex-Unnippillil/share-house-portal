"use server"

import { createSupbaseServerClient } from "@/utils/supaone"
import { Resend } from "resend"

export type NotificationResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export interface EmailNotification {
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

export interface NotificationDispatchResult {
  index: number
  success: boolean
  error?: string
}

export interface NotificationBatchResult {
  success: boolean
  results: NotificationDispatchResult[]
}

export interface NotificationService {
  sendEmail(notification: EmailNotification): Promise<NotificationResult>
  sendInApp(notification: InAppNotification): Promise<NotificationResult>
  sendBulk(
    notifications: Array<EmailNotification | InAppNotification>
  ): Promise<NotificationBatchResult>
}

export class ResendNotificationService implements NotificationService {
  private resend: Resend | null = null

  constructor(resendClient?: Resend | null) {
    if (resendClient) {
      this.resend = resendClient
      return
    }

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && apiKey !== "re_your_resend_api_key_here") {
      this.resend = new Resend(apiKey)
    }
  }

  async sendEmail(notification: EmailNotification): Promise<NotificationResult> {
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
      } as const

      const emailContent =
        emailTemplates[
          notification.template as keyof typeof emailTemplates
        ]
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

  async sendInApp(notification: InAppNotification): Promise<NotificationResult> {
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

  async sendBulk(
    notifications: Array<EmailNotification | InAppNotification>
  ): Promise<NotificationBatchResult> {
    const settled = await Promise.allSettled(
      notifications.map((notification) =>
        "to" in notification
          ? this.sendEmail(notification)
          : this.sendInApp(notification)
      )
    )

    const results = settled.map<NotificationDispatchResult>((result, index) => {
      if (result.status === "fulfilled") {
        return {
          index,
          success: result.value.success,
          error: result.value.error,
        }
      }

      const error =
        result.reason instanceof Error
          ? result.reason.message
          : typeof result.reason === "string"
          ? result.reason
          : "Unknown error"

      return { index, success: false, error }
    })

    return {
      success: results.every((entry) => entry.success),
      results,
    }
  }

  private async storeEmailNotification(notification: EmailNotification) {
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

  private getVisitorBookingTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Overnight Visitor Booking</h2>
        <p><strong>Guest:</strong> ${data?.guestName ?? "Unknown"}</p>
        <p><strong>Host:</strong> ${data?.hostName ?? "Unknown"}</p>
        <p><strong>Dates:</strong> ${data?.checkInDate ?? "Unknown"} to ${
      data?.checkOutDate ?? "Unknown"
    }</p>
        <p><strong>Purpose:</strong> ${data?.purpose ?? "Not specified"}</p>
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
        <p><strong>Requested by:</strong> ${
          data?.requesterName ?? "Unknown"
        }</p>
        <p><strong>Issue:</strong> ${data?.title ?? "Unknown"}</p>
        <p><strong>Description:</strong> ${
          data?.description ?? "No description provided"
        }</p>
        <p><strong>Priority:</strong> ${data?.priority ?? "Normal"}</p>
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
        <p><strong>Tenant:</strong> ${data?.tenantName ?? "Unknown"}</p>
        <p><strong>Amount:</strong> $${data?.amount ?? "0.00"}</p>
        <p><strong>Description:</strong> ${
          data?.description ?? "Rent payment"
        }</p>
        <p><strong>Date:</strong> ${
          data?.date ?? new Date().toLocaleDateString()
        }</p>
        <p>Thank you for your payment!</p>
      </div>
    `
  }

  private getDocumentSignedTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Signed</h2>
        <p><strong>Document:</strong> ${data?.documentTitle ?? "Unknown"}</p>
        <p><strong>Signed by:</strong> ${data?.signerName ?? "Unknown"}</p>
        <p><strong>Date:</strong> ${
          data?.signedAt ?? new Date().toLocaleDateString()
        }</p>
        <p>The signed document is now available in your portal.</p>
      </div>
    `
  }

  private getWelcomeTemplate(data?: Record<string, unknown>) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Roomsily!</h2>
        <p>Hi ${data?.tenantName ?? "there"},</p>
        <p>We're excited to have you at ${data?.propertyName ?? "your new home"}.</p>
        <p>You can now manage rent payments, amenity bookings, and communications all in one place.</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
      </div>
    `
  }
}

const defaultNotificationService = new ResendNotificationService()

export function createNotificationClient(
  service: NotificationService = defaultNotificationService
) {
  return {
    sendEmailNotification: (notification: EmailNotification) =>
      service.sendEmail(notification),
    sendInAppNotification: (notification: InAppNotification) =>
      service.sendInApp(notification),
    sendBulkNotifications: (
      notifications: Array<EmailNotification | InAppNotification>
    ) => service.sendBulk(notifications),
  }
}

export const notificationService: NotificationService =
  defaultNotificationService

export const {
  sendEmailNotification,
  sendInAppNotification,
  sendBulkNotifications,
} = createNotificationClient(notificationService)
