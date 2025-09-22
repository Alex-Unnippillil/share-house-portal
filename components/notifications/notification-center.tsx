"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase-browser";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  action_url?: string | null;
  read: boolean;
  created_at: string;
}

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: notifications = [],
    isPending: isLoading,
    isError,
    error,
  } = useQuery<Notification[], Error>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((notification: any) => ({
        ...notification,
        read: Boolean(notification.read),
      }));
    },
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: "Failed to load notifications",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) {
        throw new Error(error.message);
      }

      return notificationId;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);

      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (current = []) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      return { previous };
    },
    onError: (mutationError, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
      }
      toast({
        title: "Failed to mark notification as read",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (notificationIds.length === 0) {
        return [] as string[];
      }

      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .in("id", notificationIds);

      if (error) {
        throw new Error(error.message);
      }

      return notificationIds;
    },
    onMutate: async (notificationIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);

      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (current = []) =>
        current.map((notification) =>
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      );

      return { previous };
    },
    onError: (mutationError, _notificationIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
      }
      toast({
        title: "Failed to mark all notifications as read",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "All notifications marked as read",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        throw new Error(error.message);
      }

      return notificationId;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);

      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (current = []) =>
        current.filter((notification) => notification.id !== notificationId)
      );

      return { previous };
    },
    onError: (mutationError, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
      }
      toast({
        title: "Failed to delete notification",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (current = []) => {
            if (payload.eventType === "INSERT") {
              const incoming = payload.new as Notification & { read?: boolean | null };
              const normalized: Notification = {
                ...incoming,
                read: Boolean(incoming.read),
              };

              toast({
                title: normalized.title,
                description: normalized.message,
                variant:
                  normalized.type === "error"
                    ? "destructive"
                    : normalized.type === "warning"
                      ? "default"
                      : "default",
              });

              return [normalized, ...current.filter((notification) => notification.id !== normalized.id)].slice(0, 50);
            }

            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Notification & { read?: boolean | null };
              return current.map((notification) =>
                notification.id === updated.id
                  ? { ...notification, ...updated, read: Boolean(updated.read) }
                  : notification
              );
            }

            if (payload.eventType === "DELETE") {
              const removed = payload.old as { id: string };
              return current.filter((notification) => notification.id !== removed.id);
            }

            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, toast]);

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);
    if (unreadIds.length === 0) {
      return;
    }
    markAllAsReadMutation.mutate(unreadIds);
  };

  const handleNotificationClick = (notificationId: string, alreadyRead: boolean) => {
    if (!alreadyRead) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-100 text-green-800";
      case "warning":
        return "border-yellow-200 bg-yellow-100 text-yellow-800";
      case "error":
        return "border-red-200 bg-red-100 text-red-800";
      default:
        return "border-blue-200 bg-blue-100 text-blue-800";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 z-50 max-h-96 w-96 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="size-6 px-2 text-xs"
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="mr-1 size-3" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="size-6"
              >
                <X className="size-3" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="animate-pulse space-y-2 rounded-md border p-3">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-3 w-56 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-2 p-2">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={cn(
                          "flex cursor-pointer items-start justify-between rounded-md border p-3 transition-colors",
                          !notification.read && "bg-muted/20"
                        )}
                        onClick={() => {
                          handleNotificationClick(notification.id, notification.read);
                          if (notification.action_url) {
                            window.location.href = notification.action_url;
                          }
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getTypeColor(notification.type))}>
                              {notification.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(event) => {
                                event.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              <Check className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator className="mx-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
