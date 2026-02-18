"use client";

import { type ReactNode, useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Inbox,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
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
      setErrorMessage("We couldn't load your notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

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

  const notificationTypeStyles: Record<Notification["type"], { label: string; className: string }> = {
    info: {
      label: "Info",
      className: "border-border bg-secondary text-secondary-foreground",
    },
    success: {
      label: "Success",
      className: "border-booking-confirmed/30 bg-booking-confirmed/15 text-booking-confirmed",
    },
    warning: {
      label: "Warning",
      className: "border-payment-pending/30 bg-payment-pending/15 text-payment-pending",
    },
    error: {
      label: "Error",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
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

  const renderState = ({
    icon,
    title,
    description,
    action,
  }: {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
  }) => (
    <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="rounded-full border bg-muted/50 p-3 text-muted-foreground">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );

  const panelContent = (
    <Card className="max-h-[28rem] border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-2">
        <CardTitle className="text-sm font-medium">Notifications</CardTitle>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 px-2 text-xs"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="size-7"
            aria-label="Close notifications"
          >
            <X className="size-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          {loading
            ? renderState({
                icon: <Loader2 className="size-4 animate-spin" />,
                title: "Loading notifications",
                description: "Please wait while we refresh your activity feed.",
              })
            : errorMessage
              ? renderState({
                  icon: <AlertTriangle className="size-4" />,
                  title: "Unable to load notifications",
                  description: errorMessage,
                  action: (
                    <Button size="sm" variant="outline" onClick={fetchNotifications}>
                      Try again
                    </Button>
                  ),
                })
              : notifications.length === 0
                ? renderState({
                    icon: <Inbox className="size-4" />,
                    title: "No notifications yet",
                    description: "When updates arrive, you'll see them here.",
                  })
                : (
                  <div className="space-y-1">
                    {notifications.map((notification, index) => {
                      const typeStyle = notificationTypeStyles[notification.type];

                      return (
                        <div key={notification.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "cursor-pointer p-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
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
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (!notification.read) {
                                  markAsRead(notification.id);
                                }
                                if (notification.action_url) {
                                  window.location.href = notification.action_url;
                                  setIsOpen(false);
                                }
                              }
                            }}
                            aria-label={`Open notification: ${notification.title}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", typeStyle.className)}
                                  >
                                    {typeStyle.label}
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
                                    aria-label={`Mark notification ${notification.title} as read`}
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
                                  aria-label={`Delete notification ${notification.title}`}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {index < notifications.length - 1 && <Separator />}
                        </div>
                      );
                    })}
                  </div>
                )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Open notifications"
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
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0 sm:w-[26rem] sm:max-w-[26rem]"
          >
            {panelContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Open notifications"
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
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={12}
            className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0 sm:w-[26rem] sm:max-w-[26rem] md:w-[28rem] md:max-w-[28rem]"
          >
            {panelContent}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
