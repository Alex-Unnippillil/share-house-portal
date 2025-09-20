"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import useSupabaseBrowser from "@/utils/supabase-browser";

import type { TenantMessageAttachment, TenantMessageRecord, TenantThread } from "./actions";
import {
  createTenantMessage,
  ensureRealtimeSubscription,
  fetchTenantMessages,
  getTenantMessageById,
  pinTenantMessage,
  removeTenantMessage,
  restoreTenantMessage,
  unpinTenantMessage,
} from "./actions";
import { isStaffRole } from "./roles";

const composerSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(2000, { message: "Message is too long" }),
});

type ComposerValues = z.infer<typeof composerSchema>;

type ScopeValue = "all" | "property" | string;

type MessageBoardClientProps = {
  currentProfile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
  initialMessages: TenantMessageRecord[];
  initialCursor: string | null;
  initialHasMore: boolean;
  initialPropertyId: string;
  initialUnitId: string | null;
  threads: TenantThread[];
  pageSize: number;
};

type PropertyOption = {
  property: NonNullable<TenantThread["property"]>;
  units: Array<NonNullable<TenantThread["unit"]>>;
};

function scopeToUnitParam(scope: ScopeValue): string | null | undefined {
  if (scope === "property") {
    return null;
  }

  if (scope === "all") {
    return undefined;
  }

  return scope;
}

function sortChronologically(messages: TenantMessageRecord[]) {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return aTime - bTime;
  });
}

function abbreviateName(name: string | null) {
  if (!name) {
    return "GU";
  }

  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return name.slice(0, 2).toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function buildProperties(threads: TenantThread[]): PropertyOption[] {
  const map = new Map<string, PropertyOption>();

  threads.forEach((thread) => {
    if (!thread.property) {
      return;
    }

    if (!map.has(thread.property.id)) {
      map.set(thread.property.id, {
        property: thread.property,
        units: [],
      });
    }

    const entry = map.get(thread.property.id)!;

    if (thread.unit) {
      if (!entry.units.some((unit) => unit.id === thread.unit!.id)) {
        entry.units.push(thread.unit);
      }
    }
  });

  return Array.from(map.values());
}

function resolveInitialScope(
  options: PropertyOption[],
  propertyId: string,
  initialUnitId: string | null,
  isStaff: boolean
): ScopeValue {
  if (isStaff) {
    return "all";
  }

  if (initialUnitId) {
    return initialUnitId;
  }

  const property = options.find((option) => option.property.id === propertyId);

  if (property && property.units.length > 0) {
    return property.units[0]!.id;
  }

  return "property";
}

function resolveScopeForProperty(
  option: PropertyOption | undefined,
  isStaff: boolean
): ScopeValue {
  if (isStaff) {
    return "all";
  }

  if (option && option.units.length > 0) {
    return option.units[0]!.id;
  }

  return "property";
}

export default function MessageBoardClient({
  currentProfile,
  initialMessages,
  initialCursor,
  initialHasMore,
  initialPropertyId,
  initialUnitId,
  threads,
  pageSize,
}: MessageBoardClientProps) {
  const isStaff = isStaffRole(currentProfile.role ?? null);
  const { toast } = useToast();
  const supabase = useSupabaseBrowser();
  const propertyOptions = useMemo(() => buildProperties(threads), [threads]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId);
  const [scope, setScope] = useState<ScopeValue>(() =>
    resolveInitialScope(propertyOptions, initialPropertyId, initialUnitId, isStaff)
  );
  const [messages, setMessages] = useState(() => sortChronologically(initialMessages));
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moderatingIds, setModeratingIds] = useState<Set<number>>(new Set());
  const [attachments, setAttachments] = useState<TenantMessageAttachment[]>([]);
  const [attachmentDraft, setAttachmentDraft] = useState({ name: "", url: "" });
  const [isAttachmentFormOpen, setIsAttachmentFormOpen] = useState(false);
  const [isFetchingThread, startTransition] = useTransition();

  const form = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      body: "",
    },
  });

  const selectedProperty = useMemo(() => {
    return propertyOptions.find((option) => option.property.id === selectedPropertyId);
  }, [propertyOptions, selectedPropertyId]);

  useEffect(() => {
    if (!propertyOptions.length) {
      return;
    }

    if (!propertyOptions.some((option) => option.property.id === selectedPropertyId)) {
      const nextProperty = propertyOptions[0]!;
      setSelectedPropertyId(nextProperty.property.id);
      setScope(resolveScopeForProperty(nextProperty, isStaff));
    }
  }, [isStaff, propertyOptions, selectedPropertyId]);

  useEffect(() => {
    if (!selectedProperty) {
      return;
    }

    const validScopes = new Set<ScopeValue>(["property"]);

    if (isStaff) {
      validScopes.add("all");
    }

    selectedProperty.units.forEach((unit) => validScopes.add(unit.id));

    if (!validScopes.has(scope)) {
      setScope(resolveScopeForProperty(selectedProperty, isStaff));
    }
  }, [isStaff, scope, selectedProperty]);

  useEffect(() => {
    if (!selectedProperty) {
      return;
    }

    startTransition(() => {
      const fetchData = async () => {
        try {
          const unitParam = scopeToUnitParam(scope);
          const response = await fetchTenantMessages({
            propertyId: selectedProperty.property.id,
            unitId: unitParam,
            limit: pageSize,
            includePropertyMeta: isStaff,
          });

          setMessages(sortChronologically(response.messages));
          setCursor(response.nextCursor);
          setHasMore(response.hasMore);
          setAttachments([]);
          setAttachmentDraft({ name: "", url: "" });
          setIsAttachmentFormOpen(false);
          form.reset({ body: "" });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to load messages";
          toast({
            title: "Failed to load messages",
            description: message,
            variant: "destructive",
          });
        }
      };

      void fetchData();
    });
  }, [form, isStaff, pageSize, scope, selectedProperty, toast]);

  useEffect(() => {
    if (!selectedProperty) {
      return;
    }

    const unitParam = scopeToUnitParam(scope);

    void ensureRealtimeSubscription({
      propertyId: selectedProperty.property.id,
      unitId: unitParam,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Unable to subscribe to updates";
      toast({
        title: "Realtime subscription failed",
        description: message,
        variant: "destructive",
      });
    });

    const filter = `property_id=eq.${selectedProperty.property.id}`;
    const channelName = `tenant-messages-${selectedProperty.property.id}:${unitParam ?? "all"}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenant_messages",
          filter,
        },
        async (payload) => {
          const newUnitId = (payload.new.unit_id as string | null) ?? null;
          const shouldInclude =
            scope === "all" ||
            (scope === "property" && newUnitId === null) ||
            (scope !== "property" && scope !== "all" && (newUnitId === null || newUnitId === scope));

          if (!shouldInclude) {
            return;
          }

          try {
            const record = await getTenantMessageById({
              messageId: payload.new.id as number,
              includePropertyMeta: isStaff,
            });

            if (!record) {
              return;
            }

            setMessages((previous) => {
              const withoutOptimistic = previous.filter((message) => message.id !== record.id);

              if (withoutOptimistic.some((message) => message.id === record.id)) {
                return sortChronologically(withoutOptimistic);
              }

              return sortChronologically([...withoutOptimistic, record]);
            });
          } catch (error) {
            console.error("Failed to hydrate realtime insert", error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tenant_messages",
          filter,
        },
        async (payload) => {
          try {
            const record = await getTenantMessageById({
              messageId: payload.new.id as number,
              includePropertyMeta: isStaff,
            });

            if (!record) {
              return;
            }

            setMessages((previous) => {
              if (!previous.some((message) => message.id === record.id)) {
                return previous;
              }

              return sortChronologically(
                previous.map((message) => (message.id === record.id ? record : message))
              );
            });
          } catch (error) {
            console.error("Failed to hydrate realtime update", error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tenant_messages",
          filter,
        },
        (payload) => {
          const deletedId = payload.old.id as number;
          setMessages((previous) => previous.filter((message) => message.id !== deletedId));
        }
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        toast({
          title: "Realtime subscription failed",
          description: "Unable to subscribe to updates",
          variant: "destructive",
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, scope, selectedProperty, supabase, toast]);

  const visibleMessages = useMemo(() => {
    const sorted = sortChronologically(messages);

    if (isStaff) {
      return sorted;
    }

    return sorted.filter((message) => !message.is_removed);
  }, [isStaff, messages]);

  const pinnedMessages = useMemo(
    () =>
      visibleMessages
        .filter((message) => message.is_pinned && !message.is_removed)
        .sort((a, b) => {
          const aPinned = new Date(a.pinned_at ?? a.created_at).getTime();
          const bPinned = new Date(b.pinned_at ?? b.created_at).getTime();
          return bPinned - aPinned;
        }),
    [visibleMessages]
  );

  const regularMessages = useMemo(
    () => visibleMessages.filter((message) => !message.is_pinned),
    [visibleMessages]
  );

  const handlePropertyChange = useCallback(
    (propertyId: string) => {
      setSelectedPropertyId(propertyId);
      const nextProperty = propertyOptions.find((option) => option.property.id === propertyId);
      setScope(resolveScopeForProperty(nextProperty, isStaff));
    },
    [isStaff, propertyOptions]
  );

  const handleScopeChange = useCallback((value: string) => {
    setScope(value as ScopeValue);
  }, []);

  const handleAddAttachment = useCallback(() => {
    try {
      const url = attachmentDraft.url.trim();

      if (!url) {
        toast({
          title: "Attachment URL required",
          variant: "destructive",
        });
        return;
      }

      const urlInstance = new URL(url);
      const label = attachmentDraft.name.trim() || urlInstance.hostname;

      setAttachments((previous) => {
        if (previous.some((attachment) => attachment.url === url)) {
          return previous;
        }

        return [...previous, { name: label, url, type: null }];
      });

      setAttachmentDraft({ name: "", url: "" });
      setIsAttachmentFormOpen(false);
    } catch (error) {
      toast({
        title: "Invalid attachment URL",
        description: "Please enter a valid link (including https://)",
        variant: "destructive",
      });
    }
  }, [attachmentDraft.name, attachmentDraft.url, toast]);

  const handleRemoveAttachment = useCallback((url: string) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.url !== url));
  }, []);

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

  const onSubmit = useCallback(
    async (values: ComposerValues) => {
      if (!selectedProperty) {
        return;
      }

      const content = values.body.trim();

      if (!content) {
        return;
      }

      const unitParam = scopeToUnitParam(scope);
      const optimisticId = -Date.now();
      const optimisticMessage: TenantMessageRecord = {
        id: optimisticId,
        property_id: selectedProperty.property.id,
        unit_id: typeof unitParam === "string" ? unitParam : null,
        author_id: currentProfile.id,
        body: content,
        attachments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_pinned: false,
        pinned_at: null,
        pinned_by: null,
        is_removed: false,
        removed_at: null,
        removed_by: null,
        author: currentProfile,
        property: selectedProperty.property,
        unit:
          typeof unitParam === "string"
            ? selectedProperty.units.find((unit) => unit.id === unitParam) ?? null
            : null,
      };

      setMessages((previous) => sortChronologically([...previous, optimisticMessage]));
      form.reset({ body: "" });
      setAttachments([]);
      setAttachmentDraft({ name: "", url: "" });
      setIsAttachmentFormOpen(false);

      try {
        const created = await createTenantMessage({
          propertyId: selectedProperty.property.id,
          unitId: unitParam ?? null,
          body: content,
          attachments,
        });

        setMessages((previous) => {
          const withoutOptimistic = previous.filter((message) => message.id !== optimisticId);

          if (withoutOptimistic.some((message) => message.id === created.id)) {
            return sortChronologically(withoutOptimistic);
          }

          return sortChronologically([...withoutOptimistic, created]);
        });
      } catch (error) {
        setMessages((previous) => previous.filter((message) => message.id !== optimisticId));
        const message = error instanceof Error ? error.message : "Unable to post your message";
        toast({
          title: "Message failed to send",
          description: message,
          variant: "destructive",
        });
      }
    },
    [attachments, currentProfile, form, selectedProperty, scope, toast]
  );

  const handleLoadMore = useCallback(async () => {
    if (!cursor || !selectedProperty) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetchTenantMessages({
        propertyId: selectedProperty.property.id,
        unitId: scopeToUnitParam(scope),
        limit: pageSize,
        before: cursor,
        includePropertyMeta: isStaff,
      });

      setMessages((previous) =>
        sortChronologically([...response.messages, ...previous])
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
      setIsLoadingMore(false);
    }
  }, [cursor, isStaff, pageSize, scope, selectedProperty, toast]);

  const handlePinToggle = useCallback(
    async (message: TenantMessageRecord, desiredState: boolean) => {
      toggleModerating(message.id, true);

      try {
        const updated = desiredState
          ? await pinTenantMessage(message.id)
          : await unpinTenantMessage(message.id);

        setMessages((previous) =>
          sortChronologically(
            previous.map((existing) => (existing.id === updated.id ? updated : existing))
          )
        );

        toast({
          title: desiredState ? "Message pinned" : "Message unpinned",
        });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Unable to update message pin";
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
          sortChronologically(
            previous.map((existing) => (existing.id === updated.id ? updated : existing))
          )
        );

        toast({
          title: desiredState ? "Message removed" : "Message restored",
        });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Unable to update message status";
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

  const unitOptions = useMemo(() => {
    if (!selectedProperty) {
      return [] as Array<{ value: ScopeValue; label: string }>;
    }

    const options: Array<{ value: ScopeValue; label: string }> = [];

    options.push({ value: "property", label: "Property announcements" });

    if (isStaff) {
      options.push({ value: "all", label: "All updates" });
    }

    selectedProperty.units.forEach((unit) => {
      options.push({ value: unit.id, label: `Unit ${unit.label}` });
    });

    return options;
  }, [isStaff, selectedProperty]);

  const threadSubtitle = useMemo(() => {
    if (!selectedProperty) {
      return "";
    }

    const addressParts = [
      selectedProperty.property.address_line,
      selectedProperty.property.city,
      selectedProperty.property.state,
      selectedProperty.property.postal_code,
    ].filter(Boolean);

    return addressParts.join(", ");
  }, [selectedProperty]);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="gap-6">
        <div className="space-y-2">
          <CardTitle className="text-2xl">Community message board</CardTitle>
          <CardDescription>
            Coordinate with staff and neighbors, stay current on maintenance, and share
            updates across your property.
          </CardDescription>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Property</Label>
            <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {propertyOptions.map((option) => (
                  <SelectItem key={option.property.id} value={option.property.id}>
                    {option.property.name || "Property"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Thread</Label>
            <Select value={scope} onValueChange={handleScopeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select thread scope" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {threadSubtitle ? (
          <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            {threadSubtitle}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {isFetchingThread ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading thread…
          </div>
        ) : null}
        {pinnedMessages.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Pin className="size-4" />
              Highlighted updates
            </div>
            <div className="space-y-3">
              {pinnedMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  currentProfileId={currentProfile.id}
                  isStaff={isStaff}
                  isModerating={isModerating(message.id)}
                  onPinToggle={handlePinToggle}
                  onRemovalToggle={handleRemovalToggle}
                />
              ))}
            </div>
          </section>
        ) : null}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Recent activity</h3>
            {hasMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load older messages"
                )}
              </Button>
            ) : null}
          </div>
          {regularMessages.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {isFetchingThread ? "Loading messages…" : "No messages yet. Start the conversation below."}
            </div>
          ) : (
            <div className="space-y-3">
              {regularMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  currentProfileId={currentProfile.id}
                  isStaff={isStaff}
                  isModerating={isModerating(message.id)}
                  onPinToggle={handlePinToggle}
                  onRemovalToggle={handleRemovalToggle}
                />
              ))}
            </div>
          )}
        </section>
        <section className="space-y-4 border-t pt-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Share an update</h3>
            <p className="text-xs text-muted-foreground">
              Messages are visible to everyone participating in this thread.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Share a maintenance update, ask a question, or welcome your neighbors."
                        rows={4}
                        className="resize-none"
                        disabled={isFetchingThread}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                {attachments.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {attachments.map((attachment) => (
                      <span
                        key={attachment.url}
                        className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="size-3.5" />
                          <span className="max-w-[180px] truncate">{attachment.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(attachment.url)}
                          className="rounded-full p-1 text-muted-foreground transition hover:bg-muted-foreground/10"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                {isAttachmentFormOpen ? (
                  <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 md:flex-row md:items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="attachment-name" className="text-xs font-medium uppercase tracking-wide">
                        Label
                      </Label>
                      <Input
                        id="attachment-name"
                        value={attachmentDraft.name}
                        onChange={(event) =>
                          setAttachmentDraft((previous) => ({
                            ...previous,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Lease addendum"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="attachment-url" className="text-xs font-medium uppercase tracking-wide">
                        Link
                      </Label>
                      <Input
                        id="attachment-url"
                        value={attachmentDraft.url}
                        onChange={(event) =>
                          setAttachmentDraft((previous) => ({
                            ...previous,
                            url: event.target.value,
                          }))
                        }
                        placeholder="https://"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" onClick={handleAddAttachment} size="sm">
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAttachmentFormOpen(false);
                          setAttachmentDraft({ name: "", url: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAttachmentFormOpen((value) => !value)}
                    disabled={attachments.length >= 5 || isFetchingThread}
                  >
                    <Plus className="mr-2 size-4" />
                    Add attachment
                  </Button>
                  {attachments.length >= 5 ? (
                    <span className="text-xs text-muted-foreground">
                      Maximum of five attachments per message.
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {scope === "property"
                    ? "Posting to property announcements only."
                    : scope === "all"
                      ? "Posting to the entire property."
                      : `Posting to unit ${
                          selectedProperty?.units.find((unit) => unit.id === scope)?.label ?? ""
                        } and property announcements.`}
                </p>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || isFetchingThread}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending
                    </>
                  ) : (
                    "Post update"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </section>
      </CardContent>
    </Card>
  );
}

type MessageCardProps = {
  message: TenantMessageRecord;
  currentProfileId: string;
  isStaff: boolean;
  isModerating: boolean;
  onPinToggle: (message: TenantMessageRecord, desiredState: boolean) => void;
  onRemovalToggle: (message: TenantMessageRecord, desiredState: boolean) => void;
};

function MessageCard({
  message,
  currentProfileId,
  isStaff,
  isModerating,
  onPinToggle,
  onRemovalToggle,
}: MessageCardProps) {
  const authorName = message.author?.full_name ?? "Resident";
  const relativeTime = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  });
  const attachments = message.attachments ?? [];
  const isAuthor = message.author_id === currentProfileId;
  const unitLabel = message.unit?.label ?? null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border bg-card p-4",
        message.is_removed ? "opacity-70" : ""
      )}
    >
      <Avatar className="size-10">
        {message.author?.avatar_url ? (
          <AvatarImage src={message.author.avatar_url} alt={authorName ?? "Resident"} />
        ) : null}
        <AvatarFallback>{abbreviateName(authorName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{authorName}</span>
          {isAuthor ? <Badge variant="secondary">You</Badge> : null}
          {unitLabel ? <Badge variant="outline">Unit {unitLabel}</Badge> : null}
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
        <p
          className={cn(
            "whitespace-pre-line text-sm",
            message.is_removed ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {message.body}
        </p>
        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <a
                key={attachment.url}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-[240px] items-center gap-2 truncate rounded-md border bg-muted px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted/80"
              >
                <Paperclip className="size-3.5 shrink-0" />
                <span className="truncate">{attachment.name}</span>
              </a>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{relativeTime}</span>
          {isStaff ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onPinToggle(message, !message.is_pinned)}
                disabled={isModerating}
              >
                {isModerating ? (
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
                onClick={() => onRemovalToggle(message, !message.is_removed)}
                disabled={isModerating}
              >
                {isModerating ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : message.is_removed ? (
                  <Undo2 className="mr-1 size-3" />
                ) : (
                  <Trash2 className="mr-1 size-3" />
                )}
                {message.is_removed ? "Restore" : "Remove"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
