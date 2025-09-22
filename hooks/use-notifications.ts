"use client"

import type { InAppNotification, NotificationData } from "@/lib/notifications"
import { useToast } from "@/components/ui/use-toast"
import { fetcher, stableHash } from "@/lib/utils"

type NotificationResult = { success: boolean; error?: string }
type BulkNotificationResult = {
  success: boolean
  results: Array<{ index: number; success: boolean; error: unknown }>
}

async function postNotification<T>(payload: unknown): Promise<T> {
  const idempotencyKey = `notifications:${stableHash(payload)}`

  const data = (await fetcher<T | { error?: string }>("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey,
  })) as T | { error?: string }

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    throw new Error((data as { error: string }).error)
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
          title: "Email sent",
          description: "Notification email has been sent successfully.",
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

  const sendBulkNotifications = async (
    notifications: (NotificationData | InAppNotification)[]
  ) => {
    try {
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
