"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase-browser";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
  read: boolean;
  created_at: string;
}

type NotificationTypeFilter = Notification['type'] | 'all';
type NotificationReadFilter = 'all' | 'read' | 'unread';

interface NotificationFilters {
  search: string;
  type: NotificationTypeFilter;
  read: NotificationReadFilter;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<NotificationFilters>({
    search: "",
    type: "all",
    read: "all",
  });
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const filtersRef = useRef(filters);
  const isMounted = useRef(true);
  const isFirstRender = useRef(true);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.type !== "all" ||
    filters.read !== "all";

  const matchesFilters = useCallback(
    (notification: Notification, currentFilters: NotificationFilters) => {
      if (
        currentFilters.type !== "all" &&
        notification.type !== currentFilters.type
      ) {
        return false;
      }

      const readState = notification.read ? "read" : "unread";
      if (
        currentFilters.read !== "all" &&
        readState !== currentFilters.read
      ) {
        return false;
      }

      const searchTerm = currentFilters.search.trim().toLowerCase();
      if (searchTerm.length > 0) {
        return (
          notification.title.toLowerCase().includes(searchTerm) ||
          notification.message.toLowerCase().includes(searchTerm)
        );
      }

      return true;
    },
    [],
  );

  const fetchNotifications = useCallback(
    async (activeFilters: NotificationFilters) => {
      try {
        const { search, type, read } = activeFilters;

        let query = (supabase as any)
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (type !== 'all') {
          query = query.eq('type', type);
        }

        if (read !== 'all') {
          query = query.eq('read', read === 'read');
        }

        if (search.trim()) {
          const likePattern = `%${search.trim()}%`;
          query = query.or(`title.ilike.${likePattern},message.ilike.${likePattern}`);
        }

        setLoading(true);

        const [listResult, unreadResult] = await Promise.all([
          query,
          (supabase as any)
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('read', false),
        ]);

        if (listResult.error) throw listResult.error;

        if (!isMounted.current) {
          return;
        }

        const fetchedNotifications = (listResult.data || []) as Notification[];
        setNotifications(fetchedNotifications);

        if (!unreadResult.error && typeof unreadResult.count === 'number') {
          setUnreadCount(unreadResult.count);
        } else {
          setUnreadCount(fetchedNotifications.filter((n) => !n.read).length);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [supabase],
  );

  const debouncedFetch = useDebouncedCallback(
    (activeFilters: NotificationFilters) => {
      void fetchNotifications(activeFilters);
    },
    200,
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: "", type: "all", read: "all" });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return () => {
        debouncedFetch.cancel();
      };
    }

    setLoading(true);
    debouncedFetch(filters);
    return () => {
      debouncedFetch.cancel();
    };
  }, [filters, debouncedFetch]);

  useEffect(() => {
    void fetchNotifications(filtersRef.current);

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

          if (matchesFilters(newNotification, filtersRef.current)) {
            setNotifications(prev => [newNotification, ...prev]);
          }

          if (!newNotification.read) {
            setUnreadCount(prev => prev + 1);
          }

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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, matchesFilters, supabase, toast]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      let wasUnread = false;
      setNotifications(prev => {
        const updated = prev.map(n => {
          if (n.id === notificationId) {
            if (!n.read) {
              wasUnread = true;
            }
            return { ...n, read: true };
          }
          return n;
        });

        if (filtersRef.current.read === 'unread') {
          return updated.filter(n => !n.read);
        }

        return updated;
      });

      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
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

      let unreadBefore = 0;
      setNotifications(prev => {
        unreadBefore = prev.filter(n => !n.read).length;
        const updated = prev.map(n => ({ ...n, read: true }));
        if (filtersRef.current.read === 'unread') {
          return updated.filter(n => !n.read);
        }
        return updated;
      });

      if (unreadBefore > 0) {
        setUnreadCount(prev => Math.max(0, prev - unreadBefore));
      }

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
            <div className="space-y-3 border-b border-border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="notification-search"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Search
                  </Label>
                  <Input
                    id="notification-search"
                    placeholder="Search notifications"
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="space-y-1 sm:w-40">
                    <Label
                      htmlFor="notification-type"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Type
                    </Label>
                    <Select
                      value={filters.type}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          type: value as NotificationTypeFilter,
                        }))
                      }
                    >
                      <SelectTrigger id="notification-type">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:w-40">
                    <Label
                      htmlFor="notification-read"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Status
                    </Label>
                    <Select
                      value={filters.read}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          read: value as NotificationReadFilter,
                        }))
                      }
                    >
                      <SelectTrigger id="notification-read">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="unread">Unread</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="sm:ml-auto"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
              {filters.search.trim().length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Showing results for “{filters.search.trim()}”
                </p>
              )}
            </div>
            <ScrollArea className="h-80">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? 'No notifications match your filters'
                    : 'No notifications yet'}
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
