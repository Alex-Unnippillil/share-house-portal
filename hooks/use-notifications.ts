"use client"

import type { InAppNotification, NotificationData } from "@/lib/notifications"
import { useToast } from "@/components/ui/use-toast"

type NotificationResult = { success: boolean; error?: string }
type BulkNotificationResult = {
  success: boolean
  results: Array<{ index: number; success: boolean; error: unknown }>
}

export type MaintenanceNotificationManager = {
  id: string
  email?: string | null
  name?: string | null
}

export type MaintenanceNotificationPayload = {
  requesterName: string
  title: string
  description: string
  priority: string
  propertyManagers: MaintenanceNotificationManager[]
}

export function buildMaintenanceRequestNotifications({
  requesterName,
  title,
  description,
  priority,
  propertyManagers,
}: MaintenanceNotificationPayload): (NotificationData | InAppNotification)[] {
  const uniqueManagers = Array.from(
    new Map(
      propertyManagers
        .filter((manager) => manager && manager.id)
        .map((manager) => [manager.id, manager])
    ).values()
  )

  return uniqueManagers.flatMap((manager) => {
    const notifications: (NotificationData | InAppNotification)[] = [
      {
        userId: manager.id,
        title: "New Maintenance Request",
        message: `${requesterName} reported: ${title}`,
        type: "warning" as const,
        actionUrl: "/dashboard",
        metadata: {
          priority,
          description,
          requesterName,
          title,
          managerName: manager.name ?? null,
        },
      },
    ]

    const recipient = manager.email?.trim()
    if (recipient) {
      notifications.unshift({
        to: recipient,
        subject: `New Maintenance Request: ${title}`,
        template: "maintenance-request",
        data: {
          requesterName,
          title,
          description,
          priority,
        },
        userId: manager.id,
      })
    }

    return notifications
  })
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

  const notifyMaintenanceRequest = async (
    data: MaintenanceNotificationPayload
  ): Promise<Array<{ index: number; success: boolean; error: unknown }>> => {
    const notifications = buildMaintenanceRequestNotifications(data)

    if (notifications.length === 0) {
      return []
    }

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
