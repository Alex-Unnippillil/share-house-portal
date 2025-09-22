import { NextResponse } from 'next/server';

import {
  type InAppNotification,
  type NotificationData,
  sendBulkNotifications,
  sendEmailNotification,
  sendInAppNotification,
} from '@/lib/notifications';

type VisitorBookingPayload = {
  guestName: string;
  hostName: string;
  checkInDate: string;
  checkOutDate: string;
  purpose: string;
  roommates: Array<{ id: string; email: string; name: string }>;
  propertyManager: { id: string; email: string; name: string };
};

type MaintenanceRequestPayload = {
  requesterName: string;
  title: string;
  description: string;
  priority: string;
  propertyManager: { id: string; email: string; name: string };
};

type PaymentReceiptPayload = {
  tenantName: string;
  amount: string;
  description: string;
  date: string;
  tenantEmail: string;
  tenantId: string;
};

type DocumentSignedPayload = {
  documentTitle: string;
  signerName: string;
  signedAt: string;
  signerEmail: string;
  signerId: string;
};

type NotificationRequest =
  | { type: 'sendEmail'; payload: NotificationData }
  | { type: 'sendInApp'; payload: InAppNotification }
  | { type: 'sendBulk'; payload: (NotificationData | InAppNotification)[] }
  | { type: 'visitorBooking'; payload: VisitorBookingPayload }
  | { type: 'maintenanceRequest'; payload: MaintenanceRequestPayload }
  | { type: 'paymentReceipt'; payload: PaymentReceiptPayload }
  | { type: 'documentSigned'; payload: DocumentSignedPayload };

function createErrorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotificationRequest;

    switch (body.type) {
      case 'sendEmail': {
        const result = await sendEmailNotification(body.payload);
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
      case 'sendInApp': {
        const result = await sendInAppNotification(body.payload);
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
      case 'sendBulk': {
        const results = await sendBulkNotifications(body.payload);
        return NextResponse.json({ success: true, results });
      }
      case 'visitorBooking': {
        const { payload } = body;
        const notifications: (NotificationData | InAppNotification)[] = [
          {
            to: payload.propertyManager.email,
            subject: `New Visitor Booking: ${payload.guestName}`,
            template: 'visitor-booking',
            data: payload,
            userId: payload.propertyManager.id,
          },
          ...payload.roommates.map<InAppNotification>((roommate) => ({
            userId: roommate.id,
            title: 'New Visitor Booking',
            message: `${payload.guestName} is visiting from ${payload.checkInDate} to ${payload.checkOutDate}`,
            type: 'info',
            actionUrl: '/dashboard',
          })),
        ];
        const results = await sendBulkNotifications(notifications);
        return NextResponse.json({ success: true, results });
      }
      case 'maintenanceRequest': {
        const { payload } = body;
        const notifications: (NotificationData | InAppNotification)[] = [
          {
            to: payload.propertyManager.email,
            subject: `New Maintenance Request: ${payload.title}`,
            template: 'maintenance-request',
            data: payload,
            userId: payload.propertyManager.id,
          },
          {
            userId: payload.propertyManager.id,
            title: 'New Maintenance Request',
            message: `${payload.requesterName} reported: ${payload.title}`,
            type: 'warning',
            actionUrl: '/dashboard',
          },
        ];
        const results = await sendBulkNotifications(notifications);
        return NextResponse.json({ success: true, results });
      }
      case 'paymentReceipt': {
        const { payload } = body;
        const notifications: (NotificationData | InAppNotification)[] = [
          {
            to: payload.tenantEmail,
            subject: `Payment Receipt - $${payload.amount}`,
            template: 'payment-receipt',
            data: payload,
            userId: payload.tenantId,
          },
          {
            userId: payload.tenantId,
            title: 'Payment Successful',
            message: `Your payment of $${payload.amount} has been processed.`,
            type: 'success',
            actionUrl: '/payments',
          },
        ];
        const results = await sendBulkNotifications(notifications);
        return NextResponse.json({ success: true, results });
      }
      case 'documentSigned': {
        const { payload } = body;
        const notifications: (NotificationData | InAppNotification)[] = [
          {
            to: payload.signerEmail,
            subject: `Document Signed: ${payload.documentTitle}`,
            template: 'document-signed',
            data: payload,
            userId: payload.signerId,
          },
          {
            userId: payload.signerId,
            title: 'Document Signed',
            message: `${payload.documentTitle} has been signed.`,
            type: 'success',
            actionUrl: '/documents',
          },
        ];
        const results = await sendBulkNotifications(notifications);
        return NextResponse.json({ success: true, results });
      }
      default:
        return createErrorResponse('Unsupported notification type');
    }
  } catch (error) {
    console.error('Notification API error', error);
    return createErrorResponse('Failed to process notification request', 500);
  }
}
