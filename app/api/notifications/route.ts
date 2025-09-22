import { NextResponse } from "next/server";

import {
  sendBulkNotification,
  sendEmail,
  sendInAppNotification,
  type InAppNotification,
  type NotificationData,
} from "@/lib/notifications";

type NotificationAction =
  | { action: "sendEmail"; payload: NotificationData }
  | { action: "sendInAppNotification"; payload: InAppNotification }
  | { action: "sendBulkNotification"; payload: (NotificationData | InAppNotification)[] };

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NotificationAction;

    switch (body.action) {
      case "sendEmail": {
        const result = await sendEmail(body.payload);
        return NextResponse.json(result);
      }
      case "sendInAppNotification": {
        const result = await sendInAppNotification(body.payload);
        return NextResponse.json(result);
      }
      case "sendBulkNotification": {
        const result = await sendBulkNotification(body.payload);
        return NextResponse.json({ success: true, data: result });
      }
      default: {
        return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
      }
    }
  } catch (error) {
    console.error("Notification API error", error);
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 500 });
  }
}
