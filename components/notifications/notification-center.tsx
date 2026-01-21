"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Bell, X, Check, CheckCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase-browser";
import { cn } from "@/lib/utils";

type NotificationMetadata = Record<string, unknown> & {
  context?: string;
  thread_id?: string;
  thread_label?: string;
};

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
  read: boolean;
  created_at: string;
  thread_id?: string | null;
  metadata?: NotificationMetadata | null;
}

export interface NotificationGroup {
  id: string;
  label: string;
  context?: string;
  unreadCount: number;
  latestCreatedAt: string;
  notifications: NotificationItem[];
}

const coerceMetadata = (notification: NotificationItem): NotificationMetadata => {
  if (!notification.metadata || typeof notification.metadata !== 'object') {
    return {};
  }

  return notification.metadata as NotificationMetadata;
};

export const resolveNotificationThreadId = (
  notification: NotificationItem
): string => {
  const metadata = coerceMetadata(notification);

  if (notification.thread_id && notification.thread_id.trim().length > 0) {
    return notification.thread_id;
  }

  if (metadata.thread_id && metadata.thread_id.trim().length > 0) {
    return metadata.thread_id;
  }

  if (metadata.context && metadata.context.trim().length > 0) {
    return metadata.context;
  }

  if (metadata.thread_label && metadata.thread_label.trim().length > 0) {
    return metadata.thread_label;
  }

  return notification.id;
};

export const resolveNotificationGroupLabel = (
  notification: NotificationItem
): { label: string; context?: string } => {
  const metadata = coerceMetadata(notification);
  const contextLabel =
    (typeof metadata.context === 'string' && metadata.context.trim().length > 0
      ? metadata.context
      : undefined) ||
    (typeof metadata.thread_label === 'string' &&
      metadata.thread_label.trim().length > 0
      ? metadata.thread_label
      : undefined);

  const label = contextLabel ?? notification.thread_id ?? notification.title;

  return { label, context: contextLabel };
};

export const groupNotifications = (
  notifications: NotificationItem[]
): NotificationGroup[] => {
  const map = new Map<string, NotificationGroup>();

  for (const notification of notifications) {
    const threadId = resolveNotificationThreadId(notification);
    const { label, context } = resolveNotificationGroupLabel(notification);
    const existing = map.get(threadId);

    if (existing) {
      existing.notifications.push(notification);
      existing.unreadCount += notification.read ? 0 : 1;

      if (
        new Date(notification.created_at).getTime() >
        new Date(existing.latestCreatedAt).getTime()
      ) {
        existing.latestCreatedAt = notification.created_at;
      }

      continue;
    }

    map.set(threadId, {
      id: threadId,
      label,
      context,
      unreadCount: notification.read ? 0 : 1,
      latestCreatedAt: notification.created_at,
      notifications: [notification],
    });
  }

  const groups = Array.from(map.values()).map(group => ({
    ...group,
    notifications: [...group.notifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  groups.sort(
    (a, b) =>
      new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
  );

  return groups;
};

export const shouldDisplayNotificationToast = (
  notification: NotificationItem,
  mutedThreads: Record<string, boolean>
): boolean => {
  const threadId = resolveNotificationThreadId(notification);
  return !mutedThreads[threadId];
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutePreferences, setMutePreferences] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const mutePreferencesRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    mutePreferencesRef.current = mutePreferences;
  }, [mutePreferences]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('thread_id, muted, context');

      if (error) throw error;

      const preferences: Record<string, boolean> = {};

      for (const entry of data || []) {
        const threadKey =
          (entry.thread_id && entry.thread_id.trim().length > 0
            ? entry.thread_id
            : undefined) ||
          (entry.context && entry.context.trim().length > 0
            ? entry.context
            : undefined);

        if (threadKey) {
          preferences[threadKey] = Boolean(entry.muted);
        }
      }

      setMutePreferences(preferences);
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as NotificationItem;
          setNotifications(prev => [newNotification, ...prev]);
          const showToast = shouldDisplayNotificationToast(
            newNotification,
            mutePreferencesRef.current
          );

          if (showToast) {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant:
                newNotification.type === 'error'
                  ? 'destructive'
                  : newNotification.type === 'warning'
                  ? 'default'
                  : 'default',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, fetchPreferences, supabase, toast]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      toast({
        title: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const unreadCount = useMemo(
    () =>
      groups.reduce((total, group) => {
        if (mutePreferences[group.id]) {
          return total;
        }

        return total + group.unreadCount;
      }, 0),
    [groups, mutePreferences]
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups(prev => {
      const next: Record<string, boolean> = {};
      let hasOpenGroup = false;

      for (const group of groups) {
        const isOpen = prev[group.id] ?? false;
        next[group.id] = isOpen;
        if (isOpen) {
          hasOpenGroup = true;
        }
      }

      if (!hasOpenGroup && groups.length > 0) {
        next[groups[0].id] = true;
      }

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) {
        return next;
      }

      for (const key of nextKeys) {
        if (next[key] !== prev[key]) {
          return next;
        }
      }

      for (const key of prevKeys) {
        if (!(key in next)) {
          return next;
        }
      }

      return prev;
    });
  }, [groups]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const handleMuteChange = useCallback(
    async (group: NotificationGroup, nextMuted: boolean) => {
      setMutePreferences(prev => ({ ...prev, [group.id]: nextMuted }));

      try {
        const {
          data: existingPreference,
          error: existingError,
        } = await (supabase as any)
          .from('notification_preferences')
          .select('thread_id')
          .eq('thread_id', group.id)
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          throw existingError;
        }

        if (!existingPreference) {
          const { error: insertError } = await (supabase as any)
            .from('notification_preferences')
            .insert({
              thread_id: group.id,
              muted: nextMuted,
              context: group.context ?? group.label,
            });

          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await (supabase as any)
            .from('notification_preferences')
            .update({ muted: nextMuted })
            .eq('thread_id', group.id);

          if (updateError) throw updateError;
        }

        toast({
          title: nextMuted
            ? `Muted ${group.label}`
            : `Unmuted ${group.label}`,
          description: nextMuted
            ? 'You will no longer receive toast notifications for this thread.'
            : 'Toast notifications have been restored for this thread.',
        });
      } catch (error) {
        console.error('Failed to update notification preference:', error);
        setMutePreferences(prev => ({ ...prev, [group.id]: !nextMuted }));
        toast({
          title: 'Failed to update preference',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      }
    },
    [supabase, toast]
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-100 text-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-100 text-yellow-800';
      case 'error':
        return 'border-red-200 bg-red-100 text-red-800';
      default:
        return 'border-blue-200 bg-blue-100 text-blue-800';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
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
            {unreadCount > 99 ? '99+' : unreadCount}
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
                  onClick={markAllAsRead}
                  className="size-6 px-2 text-xs"
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
            <ScrollArea className="h-80">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {groups.map(group => {
                    const isExpanded = expandedGroups[group.id] ?? false;
                    const isMuted = mutePreferences[group.id] ?? false;

                    return (
                      <div
                        key={group.id}
                        className="rounded-md border border-border/40 bg-card"
                      >
                        <div className="flex items-start justify-between gap-2 p-3">
                          <button
                            type="button"
                            className="flex flex-1 items-center justify-between gap-2 text-left"
                            onClick={() => toggleGroup(group.id)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {group.label}
                                </span>
                                {group.unreadCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {group.unreadCount}
                                  </Badge>
                                )}
                                {isMuted && (
                                  <Badge variant="outline" className="text-xs">
                                    Muted
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {`Latest activity ${formatTime(group.latestCreatedAt)}`}
                              </p>
                            </div>
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                isExpanded ? "rotate-180" : "rotate-0"
                              )}
                            />
                          </button>
                          <div
                            className="flex items-center gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Switch
                              checked={isMuted}
                              onCheckedChange={(checked) =>
                                handleMuteChange(group, checked)
                              }
                              aria-label={
                                isMuted
                                  ? `Unmute ${group.label}`
                                  : `Mute ${group.label}`
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {isMuted ? "Muted" : "Mute"}
                            </span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-border/40">
                            {group.notifications.map((notification, itemIndex) => (
                              <div key={notification.id}>
                                <div
                                  className={cn(
                                    "cursor-pointer p-3 transition-colors hover:bg-muted/50",
                                    !notification.read && "bg-muted/20"
                                  )}
                                  onClick={() => {
                                    if (!notification.read) {
                                      markAsRead(notification.id);
                                    }
                                    if (notification.action_url) {
                                      window.location.href = notification.action_url;
                                      setIsOpen(false);
                                    }
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-xs",
                                            getTypeColor(notification.type)
                                          )}
                                        >
                                          {notification.type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {formatTime(notification.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-sm font-medium">
                                        {notification.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {notification.message}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      {!notification.read && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markAsRead(notification.id);
                                          }}
                                          className="size-6"
                                        >
                                          <Check className="size-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteNotification(notification.id);
                                        }}
                                        className="size-6 text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="size-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                {itemIndex < group.notifications.length - 1 && (
                                  <Separator />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
