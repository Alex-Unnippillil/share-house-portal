"use client"

import type { InAppNotification, NotificationData } from "@/lib/notifications"
import { useToast } from "@/components/ui/use-toast"
import { recordSupportFeedback } from "@/utils/support-feedback"

type NotificationResult = { success: boolean; error?: string }
type BulkNotificationResult = {
  success: boolean
  results: Array<{ index: number; success: boolean; error: unknown }>
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

const formatRecipients = (recipients: string | string[]) =>
  (Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean)

export function useNotifications() {
  const { toast } = useToast()

  const submitSupportFeedback = (
    action: string,
    status: "pending" | "resolved" | "escalated",
    description?: string,
    metadata?: Record<string, unknown>
  ) => {
    void recordSupportFeedback({
      source: "notifications",
      action,
      status,
      description,
      metadata,
    })
  }

  const showBackgroundToast = (
    description: string,
    seconds: number
  ) => {
    toast({
      title: "Working in the background",
      description: `${description} This typically takes about ${seconds} seconds — you can continue using the portal while we finish up.`,
      duration: 5000,
    })
  }

  const sendEmail = async (notification: NotificationData) => {
    const recipients = formatRecipients(notification.to)
    const recipientList =
      recipients.length === 1
        ? recipients[0]
        : recipients.join(', ')

    try {
      showBackgroundToast(
        `Sending "${notification.subject}" to ${recipientList || "the selected recipients"}.`,
        5
      )
      submitSupportFeedback("email_dispatch_started", "pending", undefined, {
        subject: notification.subject,
        recipients,
      })

      const result = await postNotification<NotificationResult>({
        type: "email",
        notification,
      })
      if (result.success) {
        toast({
          title: "Email update delivered",
          description: `"${notification.subject}" is on its way to ${recipientList || "the specified recipients"}.`,
        })
        submitSupportFeedback("email_dispatch_completed", "resolved", undefined, {
          subject: notification.subject,
          recipients,
        })
      } else {
        toast({
          title: "Email delivery issue",
          description:
            result.error ||
            `We couldn't deliver "${notification.subject}" to ${recipientList || "the specified recipients"}.`,
          variant: "destructive",
        })
        submitSupportFeedback(
          "email_dispatch_failed",
          "escalated",
          result.error,
          {
            subject: notification.subject,
            recipients,
          }
        )
      }
      return result
    } catch (error) {
      toast({
        title: "Email delivery error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while sending the email notification.",
        variant: "destructive",
      })
      submitSupportFeedback("email_dispatch_error", "escalated", undefined, {
        subject: notification.subject,
        recipients,
        error: error instanceof Error ? error.message : error,
      })
      return { success: false, error: "Unexpected error" }
    }
  }

  const sendInAppNotification = async (notification: InAppNotification) => {
    try {
      showBackgroundToast(
        `Posting "${notification.title}" to the notification center.`,
        3
      )
      submitSupportFeedback(
        "in_app_dispatch_started",
        "pending",
        undefined,
        {
          title: notification.title,
          userId: notification.userId,
        }
      )

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
        submitSupportFeedback("in_app_dispatch_completed", "resolved", undefined, {
          title: notification.title,
          userId: notification.userId,
        })
      }
      return result
    } catch (error) {
      toast({
        title: "Notification failed",
        description: "Failed to send in-app notification.",
        variant: "destructive",
      })
      submitSupportFeedback("in_app_dispatch_error", "escalated", undefined, {
        title: notification.title,
        userId: notification.userId,
        error: error instanceof Error ? error.message : error,
      })
      return { success: false, error: "Unexpected error" }
    }
  }

  const sendBulkNotifications = async (
    notifications: (NotificationData | InAppNotification)[]
  ) => {
    try {
      showBackgroundToast(
        "Dispatching notifications to residents and managers.",
        7
      )
      submitSupportFeedback("bulk_dispatch_started", "pending", undefined, {
        notificationCount: notifications.length,
      })

      const response = await postNotification<BulkNotificationResult>({
        type: "bulk",
        notifications,
      })
      const successCount = response.results.filter((r) => r.success).length
      const failureCount = response.results.length - successCount

      if (successCount > 0) {
        toast({
          title: "Notifications sent",
          description: `${successCount} notification${
            successCount > 1 ? "s" : ""
          } sent successfully${
            failureCount > 0 ? `, ${failureCount} failed` : ""
          }.`,
        })
        submitSupportFeedback("bulk_dispatch_completed", "resolved", undefined, {
          successCount,
          failureCount,
        })
      }

      if (failureCount > 0) {
        toast({
          title: "Some notifications need attention",
          description: `${failureCount} notification${
            failureCount > 1 ? "s" : ""
          } could not be sent. Review the activity log for details.`,
          variant: "destructive",
        })
        submitSupportFeedback("bulk_dispatch_partial_failure", "escalated", undefined, {
          successCount,
          failureCount,
        })
      }

      return response.results
    } catch (error) {
      toast({
        title: "Notification dispatch error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while sending notifications.",
        variant: "destructive",
      })
      submitSupportFeedback("bulk_dispatch_error", "escalated", undefined, {
        error: error instanceof Error ? error.message : error,
        notificationCount: notifications.length,
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
    const notifications: (NotificationData | InAppNotification)[] = [
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
    const notifications: (NotificationData | InAppNotification)[] = [
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
    const notifications: (NotificationData | InAppNotification)[] = [
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
    const notifications: (NotificationData | InAppNotification)[] = [
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
    ]

    return sendBulkNotifications(notifications)
  }

  return {
    sendEmail,
    sendInAppNotification,
    sendBulkNotifications,
    notifyVisitorBooking,
    notifyMaintenanceRequest,
    notifyPaymentReceipt,
    notifyDocumentSigned,
  }
}
