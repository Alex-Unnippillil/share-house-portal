"use client"

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react"
import { Bell, X, Check, CheckCheck, ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import {
  buildNotificationGroups,
  ensureThreadId,
  ensureThreadSource,
  formatThreadLabel,
  type NotificationGroup,
  type NotificationRow,
  type ThreadPreferenceSummary,
} from "@/lib/notifications/thread-utils"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase-browser"

type ThreadPreference = ThreadPreferenceSummary

type NotificationWithMetadata = NotificationRow & {
  metadata: Record<string, unknown> | null
  read: boolean
}

function normalizeNotification(notification: NotificationRow): NotificationWithMetadata {
  const metadata =
    notification.metadata &&
    typeof notification.metadata === "object" &&
    !Array.isArray(notification.metadata)
      ? (notification.metadata as Record<string, unknown>)
      : null

  return {
    ...notification,
    metadata,
    thread_id: ensureThreadId(notification.thread_id),
    source: ensureThreadSource(notification.source),
    read: Boolean(notification.read),
  }
}

function normalizePreference(preference: ThreadPreference): ThreadPreference {
  return {
    thread_id: ensureThreadId(preference.thread_id),
    muted: Boolean(preference.muted),
    source: ensureThreadSource(preference.source),
    thread_label: preference.thread_label ?? null,
  }
}

function getTypeColor(type: string) {
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

function formatTime(dateString: string | null) {
  if (!dateString) return "Just now"

  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

  if (Number.isNaN(diffInMinutes) || diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return date.toLocaleDateString()
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationWithMetadata[]>([])
  const [preferences, setPreferences] = useState<ThreadPreference[]>([])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [updatingThread, setUpdatingThread] = useState<string | null>(null)
  const preferencesRef = useRef<ThreadPreference[]>([])

  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  useEffect(() => {
    let active = true
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error("Failed to resolve session user:", error)
          setUserId(null)
          return
        }
        setUserId(data.user?.id ?? null)
      })
      .catch((error) => {
        if (!active) return
        console.error("Failed to resolve session user:", error)
        setUserId(null)
      })
    return () => {
      active = false
    }
  }, [supabase])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([
        (supabase as any)
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("notification_thread_preferences")
          .select("thread_id, muted, source, thread_label"),
      ])

      if (notificationResponse.error) {
        throw notificationResponse.error
      }

      if (preferenceResponse.error) {
        throw preferenceResponse.error
      }

      const notificationData =
        (notificationResponse.data as NotificationRow[] | null) ?? []
      const preferenceData =
        (preferenceResponse.data as ThreadPreference[] | null) ?? []

      setNotifications(notificationData.map(normalizeNotification))
      setPreferences(preferenceData.map(normalizePreference))
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = normalizeNotification(
            payload.new as NotificationRow
          )

          setNotifications((prev) => {
            if (prev.some((entry) => entry.id === newNotification.id)) {
              return prev
            }
            return [newNotification, ...prev]
          })

          const muted = preferencesRef.current.some(
            (preference) =>
              preference.muted &&
              ensureThreadId(preference.thread_id) ===
                ensureThreadId(newNotification.thread_id)
          )

          if (!muted) {
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase, toast])

  const groups = useMemo<NotificationGroup[]>(() => {
    return buildNotificationGroups(notifications, preferences)
  }, [notifications, preferences])

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false
      const next: Record<string, boolean> = { ...prev }

      for (const group of groups) {
        if (next[group.threadId] === undefined) {
          next[group.threadId] = !group.muted
          changed = true
        }
      }

      for (const key of Object.keys(next)) {
        if (!groups.some((group) => group.threadId === key)) {
          delete next[key]
          changed = true
        }
      }

      if (!changed) {
        return prev
      }

      return next
    })
  }, [groups])

  const unreadCount = useMemo(() => {
    return notifications.reduce((total, entry) => total + (entry.read ? 0 : 1), 0)
  }, [notifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((notification) =>
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
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id)

    if (unreadIds.length === 0) return

    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds)

      if (error) throw error

      const unreadIdSet = new Set(unreadIds)
      setNotifications((prev) =>
        prev.map((notification) =>
          unreadIdSet.has(notification.id)
            ? { ...notification, read: true }
            : notification
        )
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

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      )
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const handleMuteToggle = async (
    group: NotificationGroup,
    nextMuted: boolean
  ) => {
    if (!userId) {
      toast({
        title: "Unable to update preferences",
        description: "Please sign in again to manage notification settings.",
        variant: "destructive",
      })
      return
    }

    setUpdatingThread(group.threadId)
    try {
      const { error } = await (supabase as any)
        .from("notification_thread_preferences")
        .upsert(
          {
            user_id: userId,
            thread_id: group.threadId,
            source: group.source,
            muted: nextMuted,
            muted_at: nextMuted ? new Date().toISOString() : null,
            thread_label: group.title,
          },
          { onConflict: "user_id,thread_id" }
        )

      if (error) throw error

      setPreferences((prev) => {
        const normalizedThreadId = ensureThreadId(group.threadId)
        const updatedEntry: ThreadPreference = {
          thread_id: normalizedThreadId,
          muted: nextMuted,
          source: group.source,
          thread_label: group.title,
        }
        const existingIndex = prev.findIndex(
          (preference) => ensureThreadId(preference.thread_id) === normalizedThreadId
        )
        if (existingIndex === -1) {
          return [...prev, updatedEntry]
        }
        const next = prev.slice()
        next[existingIndex] = updatedEntry
        return next
      })

      setOpenGroups((prev) => ({
        ...prev,
        [group.threadId]: nextMuted ? false : true,
      }))

      toast({
        title: nextMuted ? "Thread muted" : "Thread unmuted",
        description: nextMuted
          ? `${group.title} notifications will be hidden going forward.`
          : `Notifications from ${group.title} are active again.`,
      })
    } catch (error) {
      console.error("Failed to update notification preference:", error)
      toast({
        title: "Preference update failed",
        description: "We couldn't update this thread's mute setting.",
        variant: "destructive",
      })
    } finally {
      setUpdatingThread(null)
    }
  }

  const handleNotificationClick = (notification: NotificationWithMetadata) => {
    if (!notification.read) {
      void markAsRead(notification.id)
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
      setIsOpen(false)
    }
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
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : groups.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {groups.map((group) => {
                    const isGroupOpen = openGroups[group.threadId] ?? !group.muted
                    return (
                      <div key={group.threadId} className="bg-background">
                        <div className="flex items-center justify-between px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenGroups((prev) => ({
                                ...prev,
                                [group.threadId]: !isGroupOpen,
                              }))
                            }
                            className="flex flex-1 items-center justify-between gap-3 text-left"
                          >
                            <span className="flex items-center gap-2">
                              <ChevronDown
                                className={cn(
                                  "size-4 transition-transform",
                                  isGroupOpen ? "rotate-180" : "-rotate-90"
                                )}
                              />
                              <span className="text-sm font-semibold">
                                {group.title}
                              </span>
                              {group.unreadCount > 0 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {group.unreadCount} new
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {group.notifications.length} {" "}
                              {group.notifications.length === 1
                                ? "notification"
                                : "notifications"}
                            </span>
                          </button>
                          <div className="ml-3 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {formatThreadLabel(group.source)}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {group.muted ? "Muted" : "Mute"}
                              </span>
                              <Switch
                                checked={group.muted}
                                onCheckedChange={(value) =>
                                  handleMuteToggle(group, value)
                                }
                                disabled={
                                  updatingThread === group.threadId || !userId
                                }
                                aria-label={`${
                                  group.muted ? "Unmute" : "Mute"
                                } ${group.title}`}
                              />
                            </div>
                          </div>
                        </div>
                        {isGroupOpen && (
                          <div className="border-t border-border/60">
                            {group.notifications.map((notification, index) => {
                              const isUnread = !notification.read
                              return (
                                <div key={notification.id}>
                                  <div
                                    className={cn(
                                      "cursor-pointer px-3 py-3 transition-colors hover:bg-muted/50",
                                      isUnread && "bg-muted/20"
                                    )}
                                    onClick={() =>
                                      handleNotificationClick(notification as NotificationWithMetadata)
                                    }
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
                                        {isUnread && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              void markAsRead(notification.id)
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
                                            void deleteNotification(notification.id)
                                          }}
                                          className="size-6 text-muted-foreground hover:text-destructive"
                                        >
                                          <X className="size-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  {index < group.notifications.length - 1 && (
                                    <Separator />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
