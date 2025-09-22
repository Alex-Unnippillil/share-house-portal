"use client"

import type {
  InAppNotification,
  NotificationData,
  NotificationPayload,
  PushNotification,
  TextNotification,
} from "@/lib/notifications"
import { useToast } from "@/components/ui/use-toast"

type NotificationResult = { success: boolean; error?: string; skipped?: boolean }
type BulkNotificationResult = {
  success: boolean
  results: Array<{ index: number; success: boolean; error: unknown; skipped?: boolean }>
}

async function postNotification<T>(payload: unknown): Promise<T> {
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null

  if (!response.ok || !data) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Failed to send notification"

    throw new Error(message)
  }

  return data as T
}

export function useNotifications() {
  const { toast } = useToast()

  const sendEmail = async (notification: NotificationData) => {
    try {
      const result = await postNotification<NotificationResult>({
        type: "email",
        notification,
      })
      if (result.success) {
        toast({
          title: result.skipped ? "Email skipped" : "Email sent",
          description: result.skipped
            ? "This recipient has email notifications disabled."
            : "Notification email has been sent successfully.",
          variant: result.skipped ? "default" : undefined,
        })
      } else {
        toast({
          title: "Email failed",
          description: result.error || "Failed to send email notification.",
          variant: "destructive",
        })
      }
      return result
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending email.",
        variant: "destructive",
      })
      return { success: false, error: "Unexpected error" }
    }
  }

  const sendInAppNotification = async (notification: InAppNotification) => {
    try {
      const result = await postNotification<NotificationResult>({
        type: "in-app",
        notification,
      })
      if (result.success) {
        // Show toast for immediate feedback
        toast({
          title: notification.title,
          description: notification.message,
          variant:
            notification.type === "error"
              ? "destructive"
              : notification.type === "warning"
              ? "default"
              : "default",
        })
      }
      return result
    } catch (error) {
      toast({
        title: "Notification failed",
        description: "Failed to send in-app notification.",
        variant: "destructive",
      })
      return { success: false, error: "Unexpected error" }
    }
  }

  const sendTextNotification = async (notification: TextNotification) => {
    try {
      const result = await postNotification<NotificationResult>({
        type: "text",
        notification: { ...notification, channel: "sms" },
      })

      if (result.success) {
        toast({
          title: result.skipped ? "Text message skipped" : "Text message sent",
          description: result.skipped
            ? "The recipient has opted out of text alerts."
            : "SMS notification delivered to the carrier.",
          variant: result.skipped ? "default" : undefined,
        })
      } else {
        toast({
          title: "Text message failed",
          description: result.error || "Failed to send text message.",
          variant: "destructive",
        })
      }

      return result
    } catch (error) {
      console.error("Text notification error", error)
      toast({
        title: "Notification failed",
        description: "Failed to send text notification.",
        variant: "destructive",
      })
      return { success: false, error: "Unexpected error" }
    }
  }

  const sendPushNotification = async (notification: PushNotification) => {
    try {
      const result = await postNotification<NotificationResult>({
        type: "push",
        notification: { ...notification, channel: "push" },
      })

      if (result.success) {
        toast({
          title: result.skipped ? "Push skipped" : "Push sent",
          description: result.skipped
            ? "The recipient disabled push alerts."
            : "Push notification dispatched successfully.",
          variant: result.skipped ? "default" : undefined,
        })
      } else {
        toast({
          title: "Push failed",
          description: result.error || "Failed to send push notification.",
          variant: "destructive",
        })
      }

      return result
    } catch (error) {
      console.error("Push notification error", error)
      toast({
        title: "Notification failed",
        description: "Failed to send push notification.",
        variant: "destructive",
      })
      return { success: false, error: "Unexpected error" }
    }
  }

  const sendBulkNotifications = async (
    notifications: NotificationPayload[]
  ) => {
    try {
      const response = await postNotification<BulkNotificationResult>({
        type: "bulk",
        notifications,
      })
      const successCount = response.results.filter((r) => r.success).length
      const failureCount = response.results.length - successCount
      const skippedCount = response.results.filter((r) => r.skipped).length

      if (successCount > 0) {
        toast({
          title: "Notifications sent",
          description: `${successCount} notification${
            successCount > 1 ? "s" : ""
          } sent successfully${
            skippedCount > 0 ? `, ${skippedCount} skipped` : ""
          }${failureCount > 0 ? `, ${failureCount} failed` : ""}.`,
        })
      }

      if (failureCount > 0) {
        toast({
          title: "Some notifications failed",
          description: `${failureCount} notification${
            failureCount > 1 ? "s" : ""
          } could not be sent.`,
          variant: "destructive",
        })
      }

      return response.results
    } catch (error) {
      toast({
        title: "Error",
        description:
          "An unexpected error occurred while sending notifications.",
        variant: "destructive",
      })
      return []
    }
  }

  // Convenience methods for common notification types
  const notifyVisitorBooking = async (data: {
    guestName: string
    hostName: string
    checkInDate: string
    checkOutDate: string
    purpose: string
    roommates: Array<{ id: string; email: string; name: string }>
    propertyManager: { id: string; email: string; name: string }
  }) => {
    const notifications: NotificationPayload[] = [
      // Email to property manager
      {
        to: data.propertyManager.email,
        subject: `New Visitor Booking: ${data.guestName}`,
        template: "visitor-booking",
        data,
        userId: data.propertyManager.id,
      },
      // In-app notifications to all roommates
      ...data.roommates.map((roommate) => ({
        userId: roommate.id,
        title: "New Visitor Booking",
        message: `${data.guestName} is visiting from ${data.checkInDate} to ${data.checkOutDate}`,
        type: "info" as const,
        actionUrl: "/dashboard",
      })),
      {
        channel: "sms",
        userId: data.propertyManager.id,
        message: `${data.guestName} requested an overnight stay (${data.checkInDate} - ${data.checkOutDate}). Review in Roomsily.`,
      },
      {
        channel: "push",
        userId: data.propertyManager.id,
        title: "New visitor booking",
        body: `${data.guestName} is visiting ${data.checkInDate} - ${data.checkOutDate}.`,
        data: { url: "/dashboard" },
      },
      ...data.roommates.map((roommate) => ({
        channel: "sms" as const,
        userId: roommate.id,
        message: `${data.guestName} is visiting from ${data.checkInDate} to ${data.checkOutDate}.`,
      })),
      ...data.roommates.map((roommate) => ({
        channel: "push" as const,
        userId: roommate.id,
        title: "Guest visit scheduled",
        body: `${data.guestName} arrives ${data.checkInDate}.`,
        data: { url: "/dashboard" },
      })),
    ]

    return sendBulkNotifications(notifications)
  }

  const notifyMaintenanceRequest = async (data: {
    requesterName: string
    title: string
    description: string
    priority: string
    propertyManager: { id: string; email: string; name: string }
  }) => {
    const notifications: NotificationPayload[] = [
      // Email to property manager
      {
        to: data.propertyManager.email,
        subject: `New Maintenance Request: ${data.title}`,
        template: "maintenance-request",
        data,
        userId: data.propertyManager.id,
      },
      // In-app notification to property manager
      {
        userId: data.propertyManager.id,
        title: "New Maintenance Request",
        message: `${data.requesterName} reported: ${data.title}`,
        type: "warning" as const,
        actionUrl: "/dashboard",
      },
      {
        channel: "sms",
        userId: data.propertyManager.id,
        message: `Maintenance alert: ${data.title} reported by ${data.requesterName}.`,
      },
      {
        channel: "push",
        userId: data.propertyManager.id,
        title: "Maintenance request",
        body: `${data.requesterName} reported "${data.title}"`,
        data: { url: "/dashboard" },
      },
    ]

    return sendBulkNotifications(notifications)
  }

  const notifyPaymentReceipt = async (data: {
    tenantName: string
    amount: string
    description: string
    date: string
    tenantEmail: string
    tenantId: string
  }) => {
    const notifications: NotificationPayload[] = [
      // Email receipt to tenant
      {
        to: data.tenantEmail,
        subject: `Payment Receipt - $${data.amount}`,
        template: "payment-receipt",
        data,
        userId: data.tenantId,
      },
      // In-app notification to tenant
      {
        userId: data.tenantId,
        title: "Payment Successful",
        message: `Your payment of $${data.amount} has been processed.`,
        type: "success" as const,
        actionUrl: "/payments",
      },
      {
        channel: "sms",
        userId: data.tenantId,
        message: `Thanks! We received your $${data.amount} payment for ${data.description}.`,
      },
      {
        channel: "push",
        userId: data.tenantId,
        title: "Payment processed",
        body: `We received your $${data.amount} payment.`,
        data: { url: "/payments" },
      },
    ]

    return sendBulkNotifications(notifications)
  }

  const notifyDocumentSigned = async (data: {
    documentTitle: string
    signerName: string
    signedAt: string
    signerEmail: string
    signerId: string
  }) => {
    const notifications: NotificationPayload[] = [
      // Email confirmation to signer
      {
        to: data.signerEmail,
        subject: `Document Signed: ${data.documentTitle}`,
        template: "document-signed",
        data,
        userId: data.signerId,
      },
      // In-app notification to signer
      {
        userId: data.signerId,
        title: "Document Signed",
        message: `You have successfully signed "${data.documentTitle}"`,
        type: "success" as const,
        actionUrl: "/documents",
      },
      {
        channel: "sms",
        userId: data.signerId,
        message: `You signed "${data.documentTitle}" on ${data.signedAt}.`,
      },
      {
        channel: "push",
        userId: data.signerId,
        title: "Document signed",
        body: `"${data.documentTitle}" is complete.`,
        data: { url: "/documents" },
      },
    ]

    return sendBulkNotifications(notifications)
  }

  return {
    sendEmail,
    sendInAppNotification,
    sendBulkNotifications,
    sendPushNotification,
    sendTextNotification,
    notifyVisitorBooking,
    notifyMaintenanceRequest,
    notifyPaymentReceipt,
    notifyDocumentSigned,
  }
}
