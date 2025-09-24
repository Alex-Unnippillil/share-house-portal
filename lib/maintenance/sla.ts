import { intervalToDuration } from "date-fns";

import type { InAppNotification, NotificationData } from "@/lib/notifications";
import { sendBulkNotifications } from "@/lib/notifications";
import type { MaintenancePriority } from "@/lib/maintenance/types";

interface Stakeholder {
  id: string;
  email?: string | null;
  name: string;
}

export interface MaintenanceSlaContext {
  requestId: string;
  requestTitle: string;
  priority: MaintenancePriority;
  slaResponseDueAt: string | null;
  slaResolutionDueAt: string | null;
  firstResponseAt: string | null;
  workCompletedAt: string | null;
  propertyManager: Stakeholder;
  vendor?: Stakeholder;
}

export interface SlaEvaluation {
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseOverdueSeconds: number | null;
  resolutionOverdueSeconds: number | null;
  hasBreach: boolean;
}

const toDurationString = (seconds: number) => {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const parts: string[] = [];
  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (parts.length === 0 && duration.seconds !== undefined) {
    parts.push(`${duration.seconds}s`);
  }
  return parts.slice(0, 2).join(" ") || "0s";
};

export const evaluateSlaBreach = (
  context: MaintenanceSlaContext,
  referenceDate: Date = new Date(),
): SlaEvaluation => {
  const responseDue = context.slaResponseDueAt
    ? new Date(context.slaResponseDueAt).getTime()
    : null;
  const resolutionDue = context.slaResolutionDueAt
    ? new Date(context.slaResolutionDueAt).getTime()
    : null;
  const now = referenceDate.getTime();

  const responseBreached = Boolean(
    responseDue && (!context.firstResponseAt || new Date(context.firstResponseAt).getTime() > responseDue) && now > responseDue,
  );
  const resolutionBreached = Boolean(
    resolutionDue && (!context.workCompletedAt || new Date(context.workCompletedAt).getTime() > resolutionDue) && now > resolutionDue,
  );

  const responseOverdueSeconds = responseBreached ? Math.floor((now - (responseDue ?? now)) / 1000) : null;
  const resolutionOverdueSeconds = resolutionBreached
    ? Math.floor((now - (resolutionDue ?? now)) / 1000)
    : null;

  return {
    responseBreached,
    resolutionBreached,
    responseOverdueSeconds,
    resolutionOverdueSeconds,
    hasBreach: responseBreached || resolutionBreached,
  };
};

export const buildSlaBreachNotifications = (
  context: MaintenanceSlaContext,
  evaluation: SlaEvaluation,
  referenceDate: Date = new Date(),
): (NotificationData | InAppNotification)[] => {
  if (!evaluation.hasBreach) {
    return [];
  }

  const notifications: (NotificationData | InAppNotification)[] = [];
  const breachedTypes: Array<"response" | "resolution"> = [];

  if (evaluation.responseBreached) {
    breachedTypes.push("response");
  }
  if (evaluation.resolutionBreached) {
    breachedTypes.push("resolution");
  }

  const buildEmailPayload = (breachType: "response" | "resolution") => ({
    requestId: context.requestId,
    requestTitle: context.requestTitle,
    priority: context.priority,
    breachType,
    dueAt:
      breachType === "response" ? context.slaResponseDueAt : context.slaResolutionDueAt,
    occurredAt: referenceDate.toISOString(),
    overdueWindow: toDurationString(
      breachType === "response"
        ? evaluation.responseOverdueSeconds ?? 0
        : evaluation.resolutionOverdueSeconds ?? 0,
    ),
  });

  const buildInAppMetadata = (breachType: "response" | "resolution") => ({
    requestId: context.requestId,
    breachType,
    priority: context.priority,
    occurredAt: referenceDate.toISOString(),
    dueAt:
      breachType === "response" ? context.slaResponseDueAt : context.slaResolutionDueAt,
  });

  for (const breachType of breachedTypes) {
    if (context.propertyManager.email) {
      notifications.push({
        to: context.propertyManager.email,
        subject: `SLA breach: ${context.requestTitle}`,
        template: "maintenance-sla-breach",
        data: buildEmailPayload(breachType),
        userId: context.propertyManager.id,
      });
    }

    notifications.push({
      userId: context.propertyManager.id,
      title: "Maintenance SLA breached",
      message: `${breachType === "response" ? "Response" : "Resolution"} SLA exceeded for ${context.requestTitle}`,
      type: "error",
      actionUrl: `/maintenance`,
      metadata: buildInAppMetadata(breachType),
    });

    if (context.vendor?.email) {
      notifications.push({
        to: context.vendor.email,
        subject: `Vendor SLA alert: ${context.requestTitle}`,
        template: "maintenance-sla-breach",
        data: buildEmailPayload(breachType),
        userId: context.vendor.id,
      });
    }

    if (context.vendor?.id) {
      notifications.push({
        userId: context.vendor.id,
        title: "SLA deadline missed",
        message: `${context.requestTitle} requires immediate attention.`,
        type: "warning",
        actionUrl: `/maintenance`,
        metadata: buildInAppMetadata(breachType),
      });
    }
  }

  return notifications;
};

export const dispatchSlaBreachNotifications = async (
  context: MaintenanceSlaContext,
  referenceDate: Date = new Date(),
) => {
  const evaluation = evaluateSlaBreach(context, referenceDate);
  const notifications = buildSlaBreachNotifications(context, evaluation, referenceDate);

  if (notifications.length === 0) {
    type BulkNotificationResult = Awaited<ReturnType<typeof sendBulkNotifications>>;
    return { evaluation, results: [] as BulkNotificationResult };
  }

  const results = await sendBulkNotifications(notifications);
  return { evaluation, results };
};
