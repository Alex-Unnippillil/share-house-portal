"use client"

import { format } from "date-fns"

import type { DomainEventEnvelope } from "@/lib/domain-events/types"
import { useToast } from "@/components/ui/use-toast"
import type { InAppNotification, NotificationData } from "@/lib/notifications"

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
    bookingId: string
    occurredAt: string
    guest: { name: string; email: string | null; phone?: string | null }
    host: { id: string; name: string; email: string | null }
    stay: { checkInDate: string; checkOutDate: string }
    purpose: string
    roommates: Array<{ id: string; email: string | null; name: string }>
    propertyManager: { id: string; email: string | null; name: string }
  }) => {
    const event: DomainEventEnvelope<"visitor.booking.submitted"> = {
      event: "visitor.booking.submitted",
      version: "1.0.0",
      occurredAt: data.occurredAt,
      payload: {
        bookingId: data.bookingId,
        guest: {
          name: data.guest.name,
          email: data.guest.email ?? null,
          phone: data.guest.phone ?? null,
        },
        host: {
          id: data.host.id,
          name: data.host.name,
          email: data.host.email ?? null,
        },
        stay: {
          checkInDate: data.stay.checkInDate,
          checkOutDate: data.stay.checkOutDate,
        },
        purpose: data.purpose,
        propertyManager: {
          id: data.propertyManager.id,
          name: data.propertyManager.name,
          email: data.propertyManager.email ?? null,
        },
        roommates: data.roommates.map((roommate) => ({
          id: roommate.id,
          name: roommate.name,
          email: roommate.email ?? null,
        })),
      },
    }

    const formattedCheckIn = format(
      new Date(data.stay.checkInDate),
      "MMM dd, yyyy"
    )
    const formattedCheckOut = format(
      new Date(data.stay.checkOutDate),
      "MMM dd, yyyy"
    )

    const templateData = {
      guestName: data.guest.name,
      hostName: data.host.name,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      purpose: data.purpose,
    }

    const notifications: (NotificationData | InAppNotification)[] = []

    if (data.propertyManager.email) {
      notifications.push({
        to: data.propertyManager.email,
        subject: `New Visitor Booking: ${data.guest.name}`,
        template: "visitor-booking",
        data: templateData,
        userId: data.propertyManager.id,
        event,
      })
    }

    notifications.push({
      userId: data.propertyManager.id,
      title: "New Visitor Booking",
      message: `${data.guest.name} is visiting from ${formattedCheckIn} to ${formattedCheckOut}`,
      type: "info",
      actionUrl: "/visitors",
      metadata: templateData,
      event,
    })

    for (const roommate of data.roommates) {
      if (roommate.email) {
        notifications.push({
          to: roommate.email,
          subject: `New Visitor Booking: ${data.guest.name}`,
          template: "visitor-booking",
          data: templateData,
          userId: roommate.id,
          event,
        })
      }

      notifications.push({
        userId: roommate.id,
        title: "New Visitor Booking",
        message: `${data.guest.name} is visiting from ${formattedCheckIn} to ${formattedCheckOut}`,
        type: "info",
        actionUrl: "/visitors",
        metadata: templateData,
        event,
      })
    }

    return sendBulkNotifications(notifications)
  }

  const notifyMaintenanceRequest = async (data: {
    requestId: string
    occurredAt: string
    unitId: string
    title: string
    description: string
    priority: "low" | "normal" | "high" | "urgent"
    category?: string | null
    location?: string | null
    requester: { id: string; name: string; email: string | null }
    propertyManager: { id: string; email: string | null; name: string }
  }) => {
    const event: DomainEventEnvelope<"maintenance.request.submitted"> = {
      event: "maintenance.request.submitted",
      version: "1.0.0",
      occurredAt: data.occurredAt,
      payload: {
        requestId: data.requestId,
        unitId: data.unitId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category ?? null,
        location: data.location ?? null,
        requester: {
          id: data.requester.id,
          name: data.requester.name,
          email: data.requester.email ?? null,
        },
        propertyManager: {
          id: data.propertyManager.id,
          name: data.propertyManager.name,
          email: data.propertyManager.email ?? null,
        },
      },
    }

    const templateData = {
      requesterName: data.requester.name,
      title: data.title,
      description: data.description,
      priority: data.priority,
      category: data.category ?? undefined,
      location: data.location ?? undefined,
    }

    const notifications: (NotificationData | InAppNotification)[] = []

    if (data.propertyManager.email) {
      notifications.push({
        to: data.propertyManager.email,
        subject: `New Maintenance Request: ${data.title}`,
        template: "maintenance-request",
        data: templateData,
        userId: data.propertyManager.id,
        event,
      })
    }

    notifications.push({
      userId: data.propertyManager.id,
      title: "New Maintenance Request",
      message: `${data.requester.name} reported: ${data.title}`,
      type: "warning" as const,
      actionUrl: "/dashboard",
      metadata: templateData,
      event,
    })

    return sendBulkNotifications(notifications)
  }

  const notifyPaymentReceipt = async (data: {
    paymentId?: string | null
    occurredAt: string
    tenant: { id: string; name: string; email: string | null }
    amount: { currency: string; value: number }
    description: string
    paymentDate: string
  }) => {
    const event: DomainEventEnvelope<"rent.payment.recorded"> = {
      event: "rent.payment.recorded",
      version: "1.0.0",
      occurredAt: data.occurredAt,
      payload: {
        paymentId: data.paymentId ?? null,
        tenant: {
          id: data.tenant.id,
          name: data.tenant.name,
          email: data.tenant.email ?? null,
        },
        amount: {
          currency: data.amount.currency,
          value: data.amount.value,
        },
        description: data.description,
        paymentDate: data.paymentDate,
      },
    }

    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: data.amount.currency,
      minimumFractionDigits: 2,
    })
    const formattedAmount = formatter.format(data.amount.value)
    const formattedDate = format(new Date(data.paymentDate), "MMM dd, yyyy")

    const templateData = {
      tenantName: data.tenant.name,
      amount: formattedAmount,
      description: data.description,
      date: formattedDate,
    }

    const notifications: (NotificationData | InAppNotification)[] = []

    if (data.tenant.email) {
      notifications.push({
        to: data.tenant.email,
        subject: `Payment Receipt - ${formattedAmount}`,
        template: "payment-receipt",
        data: templateData,
        userId: data.tenant.id,
        event,
      })
    }

    notifications.push({
      userId: data.tenant.id,
      title: "Payment Successful",
      message: `Your payment of ${formattedAmount} has been processed.`,
      type: "success" as const,
      actionUrl: "/payments",
      metadata: templateData,
      event,
    })

    return sendBulkNotifications(notifications)
  }

  const notifyDocumentSigned = async (data: {
    documentId?: string | null
    occurredAt: string
    documentTitle: string
    signer: { id: string; name: string; email: string | null }
    signedAt: string
  }) => {
    const event: DomainEventEnvelope<"document.signed"> = {
      event: "document.signed",
      version: "1.0.0",
      occurredAt: data.occurredAt,
      payload: {
        documentId: data.documentId ?? null,
        documentTitle: data.documentTitle,
        signer: {
          id: data.signer.id,
          name: data.signer.name,
          email: data.signer.email ?? null,
        },
        signedAt: data.signedAt,
      },
    }

    const formattedSignedAt = format(new Date(data.signedAt), "MMM dd, yyyy")

    const templateData = {
      documentTitle: data.documentTitle,
      signerName: data.signer.name,
      signedAt: formattedSignedAt,
      signerEmail: data.signer.email ?? undefined,
    }

    const notifications: (NotificationData | InAppNotification)[] = []

    if (data.signer.email) {
      notifications.push({
        to: data.signer.email,
        subject: `Document Signed: ${data.documentTitle}`,
        template: "document-signed",
        data: templateData,
        userId: data.signer.id,
        event,
      })
    }

    notifications.push({
      userId: data.signer.id,
      title: "Document Signed",
      message: `You have successfully signed "${data.documentTitle}"`,
      type: "success" as const,
      actionUrl: "/documents",
      metadata: templateData,
      event,
    })

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
