"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  Trash2,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import type { TenantMessageRecord } from "@/app/(tenant)/message-board/actions";
import {
  fetchTenantMessages,
  pinTenantMessage,
  removeTenantMessage,
  restoreTenantMessage,
  unpinTenantMessage,
} from "@/app/(tenant)/message-board/actions";

type PropertySummary = {
  id: string;
  name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

type ModerationClientProps = {
  currentProfile: {
    id: string;
    full_name: string | null;
    role: string | null;
  };
  properties: PropertySummary[];
  initialPropertyId: string;
  initialMessages: TenantMessageRecord[];
  initialCursor: string | null;
  initialHasMore: boolean;
  pageSize: number;
};

function sortByNewest(messages: TenantMessageRecord[]) {
  return [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function formatPropertyAddress(property: PropertySummary | undefined) {
  if (!property) {
    return "";
  }

  const parts = [
    property.address_line,
    property.city,
    property.state,
    property.postal_code,
  ].filter(Boolean);

  return parts.join(", ");
}

export default function ModerationClient({
  currentProfile,
  properties,
  initialPropertyId,
  initialMessages,
  initialCursor,
  initialHasMore,
  pageSize,
}: ModerationClientProps) {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId);
  const [messages, setMessages] = useState(() => sortByNewest(initialMessages));
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingProperty, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const [moderatingIds, setModeratingIds] = useState<Set<number>>(new Set());

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const propertyAddress = useMemo(
    () => formatPropertyAddress(selectedProperty),
    [selectedProperty]
  );

  const isModerating = useCallback(
    (id: number) => moderatingIds.has(id),
    [moderatingIds]
  );

  const toggleModerating = useCallback((id: number, active: boolean) => {
    setModeratingIds((previous) => {
      const updated = new Set(previous);
      if (active) {
        updated.add(id);
      } else {
        updated.delete(id);
      }
      return updated;
    });
  }, []);

  const handlePropertyChange = useCallback(
    (propertyId: string) => {
      setSelectedPropertyId(propertyId);
      startTransition(() => {
        const load = async () => {
          try {
            const response = await fetchTenantMessages({
              propertyId,
              limit: pageSize,
              includePropertyMeta: true,
            });

            setMessages(sortByNewest(response.messages));
            setCursor(response.nextCursor);
            setHasMore(response.hasMore);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to load messages";
            toast({
              title: "Failed to load messages",
              description: message,
              variant: "destructive",
            });
          }
        };

        void load();
      });
    },
    [pageSize, toast]
  );

  const handleLoadMore = useCallback(async () => {
    if (!cursor) {
      return;
    }

    setLoadingMore(true);

    try {
      const response = await fetchTenantMessages({
        propertyId: selectedPropertyId,
        limit: pageSize,
        before: cursor,
        includePropertyMeta: true,
      });

      setMessages((previous) =>
        sortByNewest([...previous, ...response.messages])
      );
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load more messages";
      toast({
        title: "Could not load more messages",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, pageSize, selectedPropertyId, toast]);

  const handlePinToggle = useCallback(
    async (message: TenantMessageRecord, desiredState: boolean) => {
      toggleModerating(message.id, true);

      try {
        const updated = desiredState
          ? await pinTenantMessage(message.id)
          : await unpinTenantMessage(message.id);

        setMessages((previous) =>
          sortByNewest(
            previous.map((existing) => (existing.id === updated.id ? updated : existing))
          )
        );

        toast({ title: desiredState ? "Message pinned" : "Message unpinned" });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Unable to update message";
        toast({
          title: "Moderation update failed",
          description,
          variant: "destructive",
        });
      } finally {
        toggleModerating(message.id, false);
      }
    },
    [toast, toggleModerating]
  );

  const handleRemovalToggle = useCallback(
    async (message: TenantMessageRecord, desiredState: boolean) => {
      toggleModerating(message.id, true);

      try {
        const updated = desiredState
          ? await removeTenantMessage(message.id)
          : await restoreTenantMessage(message.id);

        setMessages((previous) =>
          sortByNewest(
            previous.map((existing) => (existing.id === updated.id ? updated : existing))
          )
        );

        toast({ title: desiredState ? "Message removed" : "Message restored" });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Unable to update message";
        toast({
          title: "Moderation update failed",
          description,
          variant: "destructive",
        });
      } finally {
        toggleModerating(message.id, false);
      }
    },
    [toast, toggleModerating]
  );

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="gap-6">
        <div className="space-y-2">
          <CardTitle className="text-2xl">Moderate tenant conversations</CardTitle>
          <CardDescription>
            Review the latest posts, highlight important updates, and keep community
            threads on-topic.
          </CardDescription>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Property</Label>
            <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name || "Property"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Moderator</Label>
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              {currentProfile.full_name ?? "Staff"}
            </div>
          </div>
        </div>
        {propertyAddress ? (
          <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            {propertyAddress}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoadingProperty ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading property feed…
          </div>
        ) : null}
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No messages yet for this property.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-md border bg-card p-5",
                  message.is_removed ? "opacity-70" : ""
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {message.author?.full_name ?? "Resident"}
                    </span>
                    {message.unit?.label ? (
                      <Badge variant="outline">Unit {message.unit.label}</Badge>
                    ) : null}
                    {message.is_pinned ? (
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="size-3" />
                        Pinned
                      </Badge>
                    ) : null}
                    {message.is_removed ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" />
                        Removed
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-3 whitespace-pre-line text-sm",
                    message.is_removed ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {message.body}
                </p>
                {message.attachments.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.url}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-[260px] items-center gap-2 truncate rounded-md border bg-muted px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted/80"
                      >
                        <Paperclip className="size-3.5 shrink-0" />
                        <span className="truncate">{attachment.name}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Updated {formatDistanceToNow(new Date(message.updated_at), { addSuffix: true })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handlePinToggle(message, !message.is_pinned)}
                      disabled={isModerating(message.id)}
                    >
                      {isModerating(message.id) ? (
                        <Loader2 className="mr-1 size-3 animate-spin" />
                      ) : message.is_pinned ? (
                        <PinOff className="mr-1 size-3" />
                      ) : (
                        <Pin className="mr-1 size-3" />
                      )}
                      {message.is_pinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleRemovalToggle(message, !message.is_removed)}
                      disabled={isModerating(message.id)}
                    >
                      {isModerating(message.id) ? (
                        <Loader2 className="mr-1 size-3 animate-spin" />
                      ) : message.is_removed ? (
                        <Undo2 className="mr-1 size-3" />
                      ) : (
                        <Trash2 className="mr-1 size-3" />
                      )}
                      {message.is_removed ? "Restore" : "Remove"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMore ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full sm:w-auto"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading older messages
                </>
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
