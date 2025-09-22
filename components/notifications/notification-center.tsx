"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Bell, X, Check, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"
import { useSupabaseQuery } from "@/hooks/use-supabase-query"
import { useCurrentUser } from "@/hooks/use-current-user"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  action_url?: string
  read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const supabase = useSupabaseBrowser()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const notificationsQueryKey = useMemo(
    () => ["notifications", user?.id ?? null],
    [user?.id]
  )

  const {
    data: notifications = [],
    isLoading,
  } = useSupabaseQuery<Notification[]>({
    queryKey: notificationsQueryKey,
    enabled: Boolean(user?.id),
    placeholderData: [],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      return (data as Notification[]) ?? []
    },
  })

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  useEffect(() => {
    if (!user?.id) return

    const channel = (supabase as any)
      .channel(`notifications:user:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          const newNotification = payload.new
          queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev) => {
            const current = prev ?? []

            if (current.some((notification) => notification.id === newNotification.id)) {
              return current
            }

            return [newNotification, ...current].slice(0, 50)
          })

          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant:
              newNotification.type === "error"
                ? "destructive"
                : newNotification.type === "warning"
                ? "default"
                : "default",
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [notificationsQueryKey, queryClient, supabase, toast, user?.id])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (error) throw error

      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev) =>
        (prev ?? []).map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      )
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((notification) => !notification.read).map((n) => n.id)

      if (unreadIds.length === 0) return

      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds)

      if (error) throw error

      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev) =>
        (prev ?? []).map((notification) => ({ ...notification, read: true }))
      )

      toast({
        title: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) throw error

      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev) =>
        (prev ?? []).filter((notification) => notification.id !== notificationId)
      )
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-100 text-green-800"
      case "warning":
        return "border-yellow-200 bg-yellow-100 text-yellow-800"
      case "error":
        return "border-red-200 bg-red-100 text-red-800"
      default:
        return "border-blue-200 bg-blue-100 text-blue-800"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

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
              {isLoading ? (
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
                            markAsRead(notification.id)
                          }
                          if (notification.action_url) {
                            window.location.href = notification.action_url
                            setIsOpen(false)
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
                                onClick={(event) => {
                                  event.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="size-6"
                              >
                                <Check className="size-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteNotification(notification.id)
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
  )
}
