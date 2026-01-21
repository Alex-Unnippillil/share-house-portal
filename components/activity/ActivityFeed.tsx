"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Loader2,
  NotepadText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase-browser";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import {
  filterActivityEvents,
  sortActivityEvents,
  fetchActivityEvents,
  normaliseActivityCategory,
  type ActivityCategory,
  type ActivityEntityType,
  type ActivityEvent,
} from "@/lib/data/activity";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { label: string; value: ActivityCategory; icon: typeof MessageSquareText }[] = [
  { label: "Comments", value: "comment", icon: MessageSquareText },
  { label: "Status", value: "status_change", icon: RefreshCw },
  { label: "Attachments", value: "attachment", icon: Paperclip },
];

interface ActivityFeedProps {
  entityId: string;
  entityType: ActivityEntityType;
  className?: string;
  initialFilters?: ActivityCategory[];
}

function eventIcon(category: ActivityCategory | null) {
  switch (category) {
    case "status_change":
      return RefreshCw;
    case "attachment":
      return Paperclip;
    case "comment":
    default:
      return MessageSquareText;
  }
}

function formatStatusLabel(value: unknown) {
  if (typeof value !== "string" || !value.length) {
    return null;
  }

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function renderEventSummary(event: ActivityEvent) {
  const { category, message, metadata } = event;

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  if (metadata && typeof metadata === "object") {
    const record = metadata as Record<string, unknown>;

    if (category === "comment") {
      const comment = record.comment ?? record.note ?? record.body;
      if (typeof comment === "string" && comment.trim().length > 0) {
        return comment;
      }
      const summary = record.summary ?? record.message;
      if (typeof summary === "string" && summary.trim().length > 0) {
        return summary;
      }
      return "Left a comment.";
    }

    if (category === "status_change") {
      const from = formatStatusLabel(record.from ?? record.previous_status);
      const to = formatStatusLabel(record.to ?? record.status);

      if (from && to) {
        return `Status changed from ${from} to ${to}.`;
      }

      if (to) {
        return `Status changed to ${to}.`;
      }

      return "Status updated.";
    }

    if (category === "attachment") {
      const fileName =
        record.file_name ?? record.filename ?? record.label ?? record.name;
      if (typeof fileName === "string" && fileName.length > 0) {
        return `Uploaded ${fileName}.`;
      }

      return "Added an attachment.";
    }

    const fallback = record.message ?? record.summary ?? record.description;
    if (typeof fallback === "string" && fallback.trim().length > 0) {
      return fallback;
    }
  }

  switch (category) {
    case "attachment":
      return "Added an attachment.";
    case "status_change":
      return "Status updated.";
    case "comment":
    default:
      return "New activity recorded.";
  }
}

export function ActivityFeed({
  entityId,
  entityType,
  className,
  initialFilters,
}: ActivityFeedProps) {
  const supabase = useMemo(() => createClient() as unknown as TypedSupabaseClient, []);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActivityCategory[]>(
    initialFilters && initialFilters.length > 0
      ? initialFilters
      : FILTER_OPTIONS.map((option) => option.value),
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchActivityEvents({
      client: supabase,
      entityId,
      entityType,
    })
      .then((data) => {
        if (!isMounted) return;
        setEvents(sortActivityEvents(data));
      })
      .catch((fetchError) => {
        console.error("Failed to load activity feed", fetchError);
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load activity feed.",
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entityId, entityType, supabase]);

  const toggleFilter = useCallback(
    (category: ActivityCategory) => {
      setActiveFilters((current) => {
        const set = new Set(current);
        if (set.has(category)) {
          set.delete(category);
        } else {
          set.add(category);
        }

        if (set.size === 0) {
          return [];
        }

        return Array.from(set);
      });
    },
    [],
  );

  const visibleEvents = useMemo(() => {
    const filters = activeFilters.filter((value, index, array) => {
      return array.indexOf(value) === index;
    });

    const filtered = filterActivityEvents(events, filters);
    return sortActivityEvents(filtered);
  }, [activeFilters, events]);

  return (
    <section className={cn("space-y-4", className)} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Comments, status changes, and attachments logged for this {entityType}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const normalisedFilters = activeFilters.map((value) =>
              normaliseActivityCategory(value),
            );
            const isActive = normalisedFilters.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={() => toggleFilter(option.value)}
                className="flex items-center gap-1"
              >
                <Icon className="size-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border bg-card/30 p-4"
            >
              <div className="mt-1 rounded-full bg-muted p-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Unable to load activity.</p>
          <p className="text-xs text-destructive/80">{error}</p>
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-lg border bg-card/30 p-6 text-center">
          <NotepadText className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Updates will appear here as teammates leave comments, update statuses, or share files.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleEvents.map((event) => {
            const Icon = eventIcon(event.category);
            const timestamp = (() => {
              const date = new Date(event.createdAt);
              if (Number.isNaN(date.getTime())) return null;
              return formatDistanceToNow(date, { addSuffix: true });
            })();
            const summary = renderEventSummary(event);
            const actor = event.actorName ?? event.metadata?.actor_label ?? "System";
            return (
              <li key={event.id} className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary">
                  <Icon className="size-4" />
                </div>
                <article className="flex-1 space-y-3 rounded-lg border bg-card/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{actor}</span>
                    {event.category && (
                      <Badge variant="secondary" className="capitalize">
                        {event.category.replace("_", " ")}
                      </Badge>
                    )}
                    {timestamp && (
                      <span className="text-xs text-muted-foreground">{timestamp}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{summary}</p>

                  {event.attachments && event.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {event.attachments.map((attachment, index) => {
                        const key = `${event.id}-attachment-${index}`;
                        if (!attachment.label) {
                          return null;
                        }

                        const badge = (
                          <Badge key={key} variant="outline" className="max-w-xs truncate">
                            <Paperclip className="mr-1 size-3" />
                            {attachment.label}
                          </Badge>
                        );

                        if (attachment.url) {
                          return (
                            <a
                              key={key}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex"
                            >
                              {badge}
                            </a>
                          );
                        }

                        return badge;
                      })}
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ActivityFeed;
