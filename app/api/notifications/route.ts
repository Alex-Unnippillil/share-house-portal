import { NextResponse } from "next/server"

import {
  sendBulkNotifications,
  sendEmailNotification,
  sendInAppNotification,
  type InAppNotification,
  type NotificationData,
} from "@/lib/notifications"

type NotificationRequest =
  | { type: "email"; notification: NotificationData }
  | { type: "in-app"; notification: InAppNotification }
  | {
      type: "bulk"
      notifications: (NotificationData | InAppNotification)[]
    }

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NotificationRequest

    switch (payload.type) {
      case "email": {
        const result = await sendEmailNotification(payload.notification)
        const status = result.success ? 200 : 400
        return NextResponse.json(result, { status })
      }
      case "in-app": {
        const result = await sendInAppNotification(payload.notification)
        const status = result.success ? 200 : 400
        return NextResponse.json(result, { status })
      }
      case "bulk": {
        const results = await sendBulkNotifications(payload.notifications)
        const success = results.every((entry) => entry.success)
        return NextResponse.json(
          { success, results },
          { status: success ? 200 : 400 }
        )
      }
      default: {
        return NextResponse.json(
          { success: false, error: "Invalid notification request" },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error("Notification API error:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error sending notification"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
