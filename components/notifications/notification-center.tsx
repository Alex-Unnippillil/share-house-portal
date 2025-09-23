"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { KeyboardEvent } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>("");
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const markAllButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationRefs = useRef<(HTMLDivElement | null)[]>([]);

  const announce = useCallback((message: string) => {
    setLiveMessage("");

    const schedule =
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame
        : (callback: () => void) => setTimeout(callback, 0);

    schedule(() => {
      setLiveMessage(message);
    });
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
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          announce(
            `New ${newNotification.type} notification: ${newNotification.title}. ${newNotification.message}`,
          );

          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant:
              newNotification.type === 'error'
                ? 'destructive'
                : 'default',
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [announce, fetchNotifications, supabase, toast]);

  useEffect(() => {
    notificationRefs.current = notificationRefs.current.slice(
      0,
      notifications.length,
    );

    if (notifications.length === 0) {
      setActiveIndex(null);
      return;
    }

    if (activeIndex !== null && activeIndex >= notifications.length) {
      const newIndex = notifications.length - 1;
      setActiveIndex(newIndex);
      requestAnimationFrame(() => {
        notificationRefs.current[newIndex]?.focus();
      });
    }
  }, [notifications.length, activeIndex]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(null);
      return;
    }

    const focusTarget = markAllButtonRef.current || notificationRefs.current[0];

    if (focusTarget) {
      requestAnimationFrame(() => {
        focusTarget.focus();
      });
      if (!markAllButtonRef.current && notificationRefs.current[0]) {
        setActiveIndex(0);
      }
    }
  }, [open, notifications.length]);

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      announce(`Notification "${notification.title}" marked as read.`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      const unreadIds = unreadNotifications.map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: "All notifications marked as read",
      });
      announce("All notifications marked as read.");
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notification: Notification) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      if (error) throw error;

      const wasUnread = !notification.read;
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      announce(`Notification "${notification.title}" dismissed.`);
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

  const focusNotification = (index: number) => {
    if (index < 0 || index >= notifications.length) return;
    setActiveIndex(index);
    requestAnimationFrame(() => {
      notificationRefs.current[index]?.focus();
    });
  };

  const handleNotificationAction = (notification: Notification) => {
    if (!notification.read) {
      void markAsRead(notification);
    }

    if (notification.action_url && typeof window !== 'undefined') {
      window.location.href = notification.action_url;
      setOpen(false);
    }
  };

  const handleNotificationKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
    notification: Notification,
  ) => {
    if (notifications.length === 0) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        focusNotification((index + 1) % notifications.length);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        focusNotification(
          (index - 1 + notifications.length) % notifications.length,
        );
        break;
      }
      case 'Home': {
        event.preventDefault();
        focusNotification(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        focusNotification(notifications.length - 1);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        handleNotificationAction(notification);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        event.preventDefault();
        void deleteNotification(notification);
        break;
      }
      case 'r':
      case 'R': {
        event.preventDefault();
        void markAsRead(notification);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="notification-center"
            aria-label={open ? 'Close notifications' : 'Open notifications'}
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className="size-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent
          id="notification-center"
          className="flex w-full max-w-xl flex-col gap-4"
        >
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-semibold">
                Notifications
              </DialogTitle>
              {unreadCount > 0 && (
                <Button
                  ref={markAllButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="px-2 text-xs"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="mr-1 size-3" aria-hidden="true" />
                  Mark all read
                </Button>
              )}
            </div>
            <DialogDescription>
              Use the up and down arrow keys to move between notifications. Press
              Enter to open a notification, R to mark it as read, or Delete to
              dismiss it.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-80" role="presentation">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-1" role="list">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      ref={(node) => {
                        notificationRefs.current[index] = node;
                      }}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`${notification.title}. ${notification.message}${
                        notification.action_url
                          ? ' Press Enter to open the related item.'
                          : ''
                      }${notification.read ? '' : ' Unread notification.'}`}
                      className={cn(
                        'group rounded-md p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'hover:bg-muted/50 focus:bg-muted/50',
                        !notification.read && 'bg-muted/20',
                      )}
                      onClick={() => handleNotificationAction(notification)}
                      onKeyDown={(event) =>
                        handleNotificationKeyDown(event, index, notification)
                      }
                      onFocus={() => setActiveIndex(index)}
                      data-unread={!notification.read}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs capitalize',
                                getTypeColor(notification.type),
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
                              tabIndex={-1}
                              onClick={(event) => {
                                event.stopPropagation();
                                void markAsRead(notification);
                              }}
                              aria-label={`Mark ${notification.title} as read`}
                              className="size-7"
                            >
                              <Check className="size-3" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteNotification(notification);
                            }}
                            aria-label={`Dismiss ${notification.title}`}
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" aria-hidden="true" />
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
