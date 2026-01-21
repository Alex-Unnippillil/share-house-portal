"use client"

import type {
  EmailNotification,
  InAppNotification,
  NotificationBatchResult,
  NotificationResult,
} from "@/lib/notifications"
import { useToast } from "@/components/ui/use-toast"

type ParsedApiError = { message: string; details?: unknown }

function parseApiError(payload: unknown): ParsedApiError {
  if (payload === null || payload === undefined) {
    return { message: "Failed to send notification" }
  }

  if (typeof payload === "string") {
    return { message: payload }
  }

  if (typeof payload === "object") {
    if ("error" in payload) {
      const value = (payload as Record<string, unknown>).error
      if (typeof value === "string") {
        return { message: value }
      }
      if (value && typeof value === "object") {
        const message =
          "message" in value && typeof value.message === "string"
            ? value.message
            : "Failed to send notification"
        const details =
          "details" in value ? (value as Record<string, unknown>).details : undefined
        return { message, details }
      }
    }
  }

  return { message: "Failed to send notification" }
}

async function postNotification<T>(payload: unknown): Promise<T> {
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: unknown }
    | null

  if (!response.ok || !data) {
    const { message, details } = parseApiError(data)
    const error = new Error(message) as Error & { details?: unknown }
    if (details !== undefined) {
      error.details = details
    }
    throw error
  }

  return data as T
}

export function useNotifications() {
  const { toast } = useToast()

  const sendEmail = async (notification: EmailNotification) => {
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
    notifications: (EmailNotification | InAppNotification)[]
  ) => {
    try {
      const response = await postNotification<NotificationBatchResult>({
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
      const details =
        error && typeof error === "object" && "details" in error
          ? (error as { details?: unknown }).details
          : undefined

      if (
        details &&
        typeof details === "object" &&
        details !== null &&
        "results" in details &&
        Array.isArray((details as Record<string, unknown>).results)
      ) {
        const results = (details as { results: NotificationBatchResult["results"] }).results
        const successCount = results.filter((r) => r.success).length
        const failureCount = results.length - successCount

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

        return results
      }

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
    const notifications: (EmailNotification | InAppNotification)[] = []
    const templateData = {
      guestName: data.guestName,
      hostName: data.hostName,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      purpose: data.purpose,
    }

    if (data.propertyManager.email) {
      notifications.push({
        to: data.propertyManager.email,
        subject: `New Visitor Booking: ${data.guestName}`,
        template: "visitor-booking",
        data: templateData,
        userId: data.propertyManager.id,
      })
    }

    notifications.push({
      userId: data.propertyManager.id,
      title: "New Visitor Booking",
      message: `${data.guestName} is visiting from ${data.checkInDate} to ${data.checkOutDate}`,
      type: "info",
      actionUrl: "/visitors",
      metadata: templateData,
    })

    for (const roommate of data.roommates) {
      if (roommate.email) {
        notifications.push({
          to: roommate.email,
          subject: `New Visitor Booking: ${data.guestName}`,
          template: "visitor-booking",
          data: templateData,
          userId: roommate.id,
        })
      }

      notifications.push({
        userId: roommate.id,
        title: "New Visitor Booking",
        message: `${data.guestName} is visiting from ${data.checkInDate} to ${data.checkOutDate}`,
        type: "info",
        actionUrl: "/visitors",
        metadata: templateData,
      })
    }

    return sendBulkNotifications(notifications)
  }

  const notifyMaintenanceRequest = async (data: {
    requesterName: string
    title: string
    description: string
    priority: string
    propertyManager: { id: string; email: string; name: string }
  }) => {
    const notifications: (EmailNotification | InAppNotification)[] = [
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
    const notifications: (EmailNotification | InAppNotification)[] = [
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
    const notifications: (EmailNotification | InAppNotification)[] = [
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
