"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ClipboardList,
  Clock,
  MapPin,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { getMaintenanceRequestsAction } from "@/app/maintenance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  MaintenanceRequestWithRelations,
  MaintenanceStatusEvent,
} from "@/types/maintenance";
import { MAINTENANCE_REQUEST_CREATED_EVENT } from "./constants";

type MaintenanceStatus = MaintenanceRequestWithRelations["status"];
type MaintenancePriority = MaintenanceRequestWithRelations["priority"];

type FetchMode = "initial" | "refresh";

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pending: "Pending review",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE_VARIANT: Record<MaintenanceStatus, "outline" | "secondary" | "complete" | "destructive"> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "complete",
  cancelled: "destructive",
};

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "Low priority",
  normal: "Standard priority",
  high: "High priority",
  urgent: "Urgent",
};

const PRIORITY_BADGE_VARIANT: Record<MaintenancePriority, "secondary" | "outline" | "default" | "destructive"> = {
  low: "secondary",
  normal: "outline",
  high: "default",
  urgent: "destructive",
};

const STATUS_PROGRESS: Record<MaintenanceStatus, number> = {
  pending: 25,
  in_progress: 60,
  completed: 100,
  cancelled: 100,
};

function safeDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatRelativeTime(value: string | null): string | null {
  const date = safeDate(value);
  if (!date) {
    return null;
  }

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn("Failed to format relative time", error);
    return null;
  }
}

function formatAbsoluteTime(value: string | null): string | null {
  const date = safeDate(value);
  if (!date) {
    return null;
  }

  try {
    return format(date, "PPP · p");
  } catch (error) {
    console.warn("Failed to format timestamp", error);
    return null;
  }
}

function buildStatusEvents(request: MaintenanceRequestWithRelations): MaintenanceStatusEvent[] {
  const events: MaintenanceStatusEvent[] = [];

  const submittedRelative = formatRelativeTime(request.created_at);
  const locationContext = request.location ? ` in ${request.location.toLowerCase()}` : "";

  events.push({
    id: "submitted",
    label: "Request submitted",
    description: submittedRelative
      ? `Issue reported${locationContext} ${submittedRelative}.`
      : `Issue reported${locationContext}.`,
    occurredAt: request.created_at,
    state: "complete",
  });

  if (request.status === "cancelled") {
    events.push({
      id: "cancelled",
      label: "Request cancelled",
      description: "This request was closed without resolution.",
      occurredAt: request.updated_at,
      state: "current",
    });

    return events;
  }

  const triageDescription = request.assignee
    ? `Assigned to ${request.assignee.full_name || request.assignee.email || "maintenance team"}.`
    : "Waiting for assignment to the maintenance team.";

  events.push({
    id: "triage",
    label: "Triage",
    description: request.status === "pending" ? "Property manager notified and reviewing." : triageDescription,
    occurredAt: request.status === "pending" ? null : request.updated_at,
    state: request.status === "pending" ? "current" : "complete",
  });

  const progressState: MaintenanceStatusEvent["state"] =
    request.status === "in_progress"
      ? "current"
      : request.status === "completed"
        ? "complete"
        : "upcoming";

  events.push({
    id: "in-progress",
    label: "Work in progress",
    description:
      request.status === "pending"
        ? "Work will begin once the request is assigned."
        : request.status === "in_progress"
          ? request.assignee
            ? `${request.assignee.full_name || request.assignee.email || "The maintenance team"} is resolving the issue.`
            : "Maintenance team is resolving the issue."
          : "Work completed and pending verification.",
    occurredAt: request.status === "pending" ? null : request.updated_at,
    state: progressState,
  });

  events.push({
    id: "resolved",
    label: "Resolved",
    description:
      request.status === "completed"
        ? request.completed_at
          ? `Issue resolved ${formatRelativeTime(request.completed_at)}.`
          : "Issue resolved."
        : "Pending completion and confirmation.",
    occurredAt: request.completed_at,
    state: request.status === "completed" ? "complete" : "upcoming",
  });

  return events;
}

function RequestSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border/60 bg-muted/30 p-4"
        >
          <div className="mb-3 h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mb-6 h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-1 size-2 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted/80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaintenanceStatusTracker() {
  const [requests, setRequests] = useState<MaintenanceRequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(
    async (mode: FetchMode = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await getMaintenanceRequestsAction();

        if (result.success && result.data) {
          setRequests(result.data);
          setError(null);
        } else {
          setError(result.error || "Unable to load maintenance requests.");
        }
      } catch (fetchError) {
        console.error("Error loading maintenance requests", fetchError);
        setError("An unexpected error occurred while loading requests.");
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchRequests("initial");
  }, [fetchRequests]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchRequests("refresh");
    };

    window.addEventListener(MAINTENANCE_REQUEST_CREATED_EVENT, handleRefresh);

    return () => {
      window.removeEventListener(MAINTENANCE_REQUEST_CREATED_EVENT, handleRefresh);
    };
  }, [fetchRequests]);

  const requestSummaries = useMemo(() => {
    return requests.map((request) => ({
      request,
      events: buildStatusEvents(request),
      submittedRelative: formatRelativeTime(request.created_at),
    }));
  }, [requests]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl">Request timeline</CardTitle>
          <CardDescription>
            Monitor every maintenance request from submission through resolution.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => fetchRequests("refresh")}
          disabled={loading || refreshing}
        >
          <RefreshCw className={cn("mr-2 size-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <RequestSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
            <AlertCircle className="size-8" />
            <div className="space-y-1">
              <p className="text-sm font-medium">We couldn&apos;t load maintenance updates</p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchRequests("refresh")}>
              Try again
            </Button>
          </div>
        ) : requestSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <ClipboardList className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No maintenance requests yet</p>
              <p className="text-xs text-muted-foreground">
                Submit your first maintenance request to start tracking progress here.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[560px] pr-4">
            <div className="space-y-4 pb-2">
              {requestSummaries.map(({ request, events, submittedRelative }) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-border/60 bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold leading-none sm:text-base">
                            {request.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {request.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" />
                                {request.location}
                              </span>
                            )}
                            {submittedRelative && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                Submitted {submittedRelative}
                              </span>
                            )}
                          </div>
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground">
                            {request.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3" />
                            {request.assignee
                              ? `Assigned to ${request.assignee.full_name || request.assignee.email || "maintenance"}`
                              : "Awaiting assignment"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant={STATUS_BADGE_VARIANT[request.status]}>
                          {STATUS_LABELS[request.status]}
                        </Badge>
                        <Badge variant={PRIORITY_BADGE_VARIANT[request.priority]}>
                          {PRIORITY_LABELS[request.priority]}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Progress value={STATUS_PROGRESS[request.status]} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Submitted</span>
                        <span>{request.status === "completed" ? "Resolved" : request.status === "cancelled" ? "Closed" : "In progress"}</span>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {events.map((event, index) => (
                        <li key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "mt-1 size-2 rounded-full",
                                event.state === "complete" && "bg-primary",
                                event.state === "current" && "bg-primary ring-4 ring-primary/20",
                                event.state === "upcoming" && "bg-muted-foreground/20",
                              )}
                            />
                            {index < events.length - 1 && (
                              <span className="mt-1 w-px flex-1 bg-muted-foreground/20" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{event.label}</p>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                            {event.occurredAt && (
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                                {formatAbsoluteTime(event.occurredAt)}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
