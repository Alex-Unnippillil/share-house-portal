"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { Resend } from "resend"

import type { Database } from "@/lib/supabase"
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin"

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
  private supabase: SupabaseClient<Database> | null = null

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && apiKey !== "re_your_resend_api_key_here") {
      this.resend = new Resend(apiKey)
    }
  }

  private getSupabaseClient() {
    if (!this.supabase) {
      try {
        this.supabase = getSupabaseServiceRoleClient()
      } catch (error) {
        console.error("Supabase service role client unavailable", error)
        return null
      }
    }

    return this.supabase
  }

  async sendEmail(notification: NotificationData, context?: { jobId?: string }) {
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
        await this.storeEmailNotification(notification, context)
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

  async sendInAppNotification(
    notification: InAppNotification,
    context?: { jobId?: string }
  ) {
    try {
      const supabase = this.getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase client is not configured")
      }

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.actionUrl,
          metadata:
            notification.metadata || context?.jobId
              ? {
                  ...(notification.metadata ?? {}),
                  ...(context?.jobId ? { jobId: context.jobId } : {}),
                }
              : null,
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

  private async storeEmailNotification(
    notification: NotificationData,
    context?: { jobId?: string }
  ) {
    try {
      const supabase = this.getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase client is not configured")
      }

      await supabase.from("email_notifications").insert({
        user_id: notification.userId,
        recipient: Array.isArray(notification.to)
          ? notification.to.join(", ")
          : notification.to,
        subject: notification.subject,
        template: notification.template,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata:
          notification.data || context?.jobId
            ? {
                ...(notification.data ?? {}),
                ...(context?.jobId ? { jobId: context.jobId } : {}),
              }
            : null,
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

export async function sendEmailNotification(
  notification: NotificationData,
  context?: { jobId?: string }
) {
  return notificationService.sendEmail(notification, context)
}

export async function sendInAppNotification(
  notification: InAppNotification,
  context?: { jobId?: string }
) {
  return notificationService.sendInAppNotification(notification, context)
}

export async function sendBulkNotifications(
  notifications: (NotificationData | InAppNotification)[]
) {
  return notificationService.sendBulkNotification(notifications)
}
