import { useToast } from "@/components/ui/use-toast";
import type { InAppNotification, NotificationData } from "@/lib/notifications";

type BulkNotificationResult = {
  index: number;
  success: boolean;
  error?: unknown;
};

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

type NotificationRequestBody =
  | { type: "sendEmail"; payload: NotificationData }
  | { type: "sendInApp"; payload: InAppNotification }
  | { type: "sendBulk"; payload: (NotificationData | InAppNotification)[] }
  | { type: "visitorBooking"; payload: VisitorBookingPayload }
  | { type: "maintenanceRequest"; payload: MaintenanceRequestPayload }
  | { type: "paymentReceipt"; payload: PaymentReceiptPayload }
  | { type: "documentSigned"; payload: DocumentSignedPayload };

type NotificationApiError = { error?: string };

type BulkResponse = { success: true; results: BulkNotificationResult[] };

type SingleResponse = { success: boolean; error?: string };

async function postNotificationRequest<T>(body: NotificationRequestBody): Promise<T> {
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as NotificationApiError | null;
    throw new Error(errorBody?.error ?? "Notification request failed");
  }

  return (await response.json()) as T;
}

export function useNotifications() {
  const { toast } = useToast();

  const handleBulkResults = (results: BulkNotificationResult[]) => {
    const successCount = results.filter((result) => result.success).length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      toast({
        title: "Notifications sent",
        description: `${successCount} notification${successCount > 1 ? "s" : ""} sent successfully${
          failureCount > 0 ? `, ${failureCount} failed` : ""
        }.`,
      });
    }

    if (failureCount > 0) {
      toast({
        title: "Some notifications failed",
        description: `${failureCount} notification${failureCount > 1 ? "s" : ""} could not be sent.`,
        variant: "destructive",
      });
    }
  };

  const sendEmail = async (notification: NotificationData) => {
    try {
      const result = await postNotificationRequest<SingleResponse>({
        type: "sendEmail",
        payload: notification,
      });

      if (result.success) {
        toast({
          title: "Email sent",
          description: "Notification email has been sent successfully.",
        });
      } else {
        toast({
          title: "Email failed",
          description: result.error || "Failed to send email notification.",
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending email.",
        variant: "destructive",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      };
    }
  };

  const sendInAppNotification = async (notification: InAppNotification) => {
    try {
      const result = await postNotificationRequest<SingleResponse>({
        type: "sendInApp",
        payload: notification,
      });

      if (result.success) {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === "error" ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Notification failed",
          description: result.error || "Failed to send in-app notification.",
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      toast({
        title: "Notification failed",
        description: "Failed to send in-app notification.",
        variant: "destructive",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      };
    }
  };

  const sendBulkNotifications = async (notifications: (NotificationData | InAppNotification)[]) => {
    try {
      const result = await postNotificationRequest<BulkResponse>({
        type: "sendBulk",
        payload: notifications,
      });

      handleBulkResults(result.results);
      return result.results;
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending notifications.",
        variant: "destructive",
      });
      return [];
    }
  };

  const notifyVisitorBooking = async (data: VisitorBookingPayload) => {
    try {
      const result = await postNotificationRequest<BulkResponse>({
        type: "visitorBooking",
        payload: data,
      });

      handleBulkResults(result.results);
      return result.results;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send visitor booking notifications.",
        variant: "destructive",
      });
      return [];
    }
  };

  const notifyMaintenanceRequest = async (data: MaintenanceRequestPayload) => {
    try {
      const result = await postNotificationRequest<BulkResponse>({
        type: "maintenanceRequest",
        payload: data,
      });

      handleBulkResults(result.results);
      return result.results;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send maintenance request notifications.",
        variant: "destructive",
      });
      return [];
    }
  };

  const notifyPaymentReceipt = async (data: PaymentReceiptPayload) => {
    try {
      const result = await postNotificationRequest<BulkResponse>({
        type: "paymentReceipt",
        payload: data,
      });

      handleBulkResults(result.results);
      return result.results;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send payment receipt notifications.",
        variant: "destructive",
      });
      return [];
    }
  };

  const notifyDocumentSigned = async (data: DocumentSignedPayload) => {
    try {
      const result = await postNotificationRequest<BulkResponse>({
        type: "documentSigned",
        payload: data,
      });

      handleBulkResults(result.results);
      return result.results;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send document signed notifications.",
        variant: "destructive",
      });
      return [];
    }
  };

  return {
    sendEmail,
    sendInAppNotification,
    sendBulkNotifications,
    notifyVisitorBooking,
    notifyMaintenanceRequest,
    notifyPaymentReceipt,
    notifyDocumentSigned,
  };
}
