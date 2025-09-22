"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
  read: boolean;
  created_at: string;
}

type NotificationEventType = 'INSERT' | 'UPDATE' | 'DELETE';

interface QueuedNotificationChange {
  type: NotificationEventType;
  payload: Notification;
  receivedAt: number;
  shouldAnnounce: boolean;
}

const FLUSH_INTERVAL_MS = 1000 / 60;

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const eventQueueRef = useRef<QueuedNotificationChange[]>([]);
  const queueIndexRef = useRef<Map<string, number>>(new Map());
  const animationFrameRef = useRef<number>();
  const lastFlushTimestampRef = useRef<number | null>(null);
  const droppedFramesCounterRef = useRef(0);

  const reportDroppedFrames = useCallback((framesMissed: number, delta: number) => {
    droppedFramesCounterRef.current += framesMissed;

    const detail = {
      framesMissed,
      delta,
      totalDroppedFrames: droppedFramesCounterRef.current,
      queueDepth: eventQueueRef.current.length,
      timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('realtime:frames-dropped', { detail }));
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Realtime] Dropped frames detected while applying notification updates.', detail);
    }
  }, []);

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
      setUnreadCount(data?.filter((n: any) => !n.read).length || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const enqueueChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Notification>) => {
      const { eventType } = payload;
      if (eventType !== 'INSERT' && eventType !== 'UPDATE' && eventType !== 'DELETE') {
        return;
      }

      const normalizedType = eventType as NotificationEventType;
      const recordSource = normalizedType === 'DELETE' ? payload.old : payload.new;
      if (!recordSource) {
        return;
      }

      const record = recordSource as Notification;
      if (!record.id) {
        return;
      }

      const queue = eventQueueRef.current;
      const queueIndex = queueIndexRef.current;
      const existingIndex = queueIndex.get(record.id);
      const queuedChange: QueuedNotificationChange = {
        type: normalizedType,
        payload: record,
        receivedAt: Date.now(),
        shouldAnnounce: normalizedType === 'INSERT',
      };

      if (existingIndex !== undefined) {
        const existingChange = queue[existingIndex];
        queue[existingIndex] = {
          ...queuedChange,
          shouldAnnounce: existingChange.shouldAnnounce || queuedChange.shouldAnnounce,
        };
      } else {
        queueIndex.set(record.id, queue.length);
        queue.push(queuedChange);
      }
    },
    [],
  );

  const flushQueue = useCallback(() => {
    if (eventQueueRef.current.length === 0) {
      return;
    }

    const queuedEvents = eventQueueRef.current.splice(0);
    queueIndexRef.current.clear();

    const toasts: Notification[] = [];
    let nextState: Notification[] | null = null;

    setNotifications(prev => {
      let working = [...prev];
      let mutated = false;

      for (const event of queuedEvents) {
        if (event.type === 'INSERT') {
          working = [event.payload, ...working.filter(n => n.id !== event.payload.id)];
          mutated = true;

          if (event.shouldAnnounce) {
            toasts.push(event.payload);
          }
        } else if (event.type === 'UPDATE') {
          const index = working.findIndex(n => n.id === event.payload.id);
          if (index !== -1) {
            working[index] = event.payload;
            mutated = true;
          }
        } else if (event.type === 'DELETE') {
          const beforeLength = working.length;
          working = working.filter(n => n.id !== event.payload.id);
          if (beforeLength !== working.length) {
            mutated = true;
          }
        }
      }

      if (mutated) {
        working.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        nextState = working;
        return working;
      }

      return prev;
    });

    if (nextState) {
      setUnreadCount(nextState.filter(n => !n.read).length);
    }

    if (toasts.length > 0) {
      for (const notification of toasts) {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === 'error' ? 'destructive' : 'default',
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notification changes and buffer events before applying to UI.
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        enqueueChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enqueueChange, fetchNotifications, supabase]);

  useEffect(() => {
    const step = (timestamp: number) => {
      if (lastFlushTimestampRef.current === null) {
        lastFlushTimestampRef.current = timestamp;
      }

      const elapsed = timestamp - (lastFlushTimestampRef.current ?? timestamp);

      if (elapsed >= FLUSH_INTERVAL_MS) {
        const framesMissed = Math.max(0, Math.round(elapsed / FLUSH_INTERVAL_MS) - 1);
        if (framesMissed > 0 && eventQueueRef.current.length > 0) {
          reportDroppedFrames(framesMissed, elapsed);
        }

        lastFlushTimestampRef.current = timestamp;
        flushQueue();
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [flushQueue, reportDroppedFrames]);

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
      setUnreadCount(prev => Math.max(0, prev - 1));
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

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

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

      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

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
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
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
                                className={cn("text-xs", getTypeColor(notification.type))}
                              >
                                {notification.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(notification.created_at)}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
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
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
