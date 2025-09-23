"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase-browser";
import { cn } from "@/lib/utils";
import { SoftDeleteQueue } from "@/lib/soft-delete-queue";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
  read: boolean;
  created_at: string;
  hidden?: boolean;
  hidden_at?: string | null;
  delete_after?: string | null;
}

const SOFT_DELETE_WINDOW_MS = 30_000;

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast, dismiss } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const toastIdsRef = useRef(new Map<string, string>());
  const handlePermanentDeleteRef = useRef<
    (id: string, notification: Notification) => void | Promise<void>
  >();
  const deletionQueueRef = useRef<SoftDeleteQueue<Notification>>();

  const handlePermanentDelete = useCallback(
    async (notificationId: string, _notification?: Notification) => {
      const toastId = toastIdsRef.current.get(notificationId);
      if (toastId) {
        dismiss(toastId);
        toastIdsRef.current.delete(notificationId);
      }

      try {
        const { error } = await (supabase as any)
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('hidden', true);

        if (error) throw error;
      } catch (error) {
        console.error('Failed to permanently delete notification:', error);
      }
    },
    [dismiss, supabase]
  );

  handlePermanentDeleteRef.current = (id, notification) =>
    handlePermanentDelete(id, notification);

  if (!deletionQueueRef.current) {
    deletionQueueRef.current = new SoftDeleteQueue<Notification>(
      SOFT_DELETE_WINDOW_MS,
      (id, notification) => {
        handlePermanentDeleteRef.current?.(id, notification);
      }
    );
  }

  const deletionQueue = deletionQueueRef.current!;

  useEffect(() => {
    return () => {
      deletionQueueRef.current?.flush();
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .or('hidden.is.null,hidden.eq.false')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const records = ((data || []) as Notification[]).filter(
        notification => notification.hidden !== true
      );
      setNotifications(records);
      setUnreadCount(records.filter(notification => !notification.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();

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
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' :
                    newNotification.type === 'warning' ? 'default' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, supabase, toast]);

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

  const handleUndo = useCallback(
    async (notificationId: string) => {
      const restored = deletionQueue.undo(notificationId);

      if (!restored) {
        return;
      }

      const toastId = toastIdsRef.current.get(notificationId);
      if (toastId) {
        dismiss(toastId);
        toastIdsRef.current.delete(notificationId);
      }

      try {
        const { error } = await (supabase as any)
          .from('notifications')
          .update({
            hidden: false,
            hidden_at: null,
            delete_after: null,
          })
          .eq('id', notificationId);

        if (error) throw error;

        setNotifications(prev => {
          const filtered = prev.filter(n => n.id !== notificationId);
          const next = [restored, ...filtered];
          return next.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        if (!restored.read) {
          setUnreadCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Failed to undo notification deletion:', error);
        deletionQueue.schedule(notificationId, restored);
        const { id: retryToastId } = toast({
          title: 'Unable to restore notification',
          description: 'Please try again within 30 seconds.',
          variant: 'destructive',
          action: (
            <ToastAction
              altText="Retry undo"
              onClick={() => handleUndo(notificationId)}
            >
              Retry
            </ToastAction>
          ),
        });
        toastIdsRef.current.set(notificationId, retryToastId);
      }
    },
    [deletionQueue, dismiss, supabase, toast]
  );

  const deleteNotification = async (notificationId: string) => {
    try {
      const targetNotification = notifications.find(
        n => n.id === notificationId
      );

      if (!targetNotification) {
        return;
      }

      const now = new Date();
      const deleteAfter = new Date(now.getTime() + SOFT_DELETE_WINDOW_MS)
        .toISOString();

      const { error } = await (supabase as any)
        .from('notifications')
        .update({
          hidden: true,
          hidden_at: now.toISOString(),
          delete_after: deleteAfter,
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (!targetNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      deletionQueue.schedule(notificationId, targetNotification);

      const { id: toastId } = toast({
        title: 'Notification deleted',
        description: 'Undo within 30 seconds to restore it.',
        action: (
          <ToastAction
            altText="Undo delete"
            onClick={() => handleUndo(notificationId)}
          >
            Undo
          </ToastAction>
        ),
      });

      toastIdsRef.current.set(notificationId, toastId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: 'Failed to delete notification',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
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
