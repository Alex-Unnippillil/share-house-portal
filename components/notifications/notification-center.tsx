"use client"

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { Bell, Check, CheckCheck, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { trackPaginationEvent, type PaginationAction } from "@/lib/analytics"
import { getMockNotificationsPage } from "@/lib/mock-data/notifications"
import type { Tables } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase-browser"

const PAGE_SIZE = 10

type NotificationRecord = Tables<"notifications">

type NotificationType = NonNullable<NotificationRecord["type"]>

const TYPE_STYLES: Record<NotificationType, string> = {
  success: "border-green-200 bg-green-100 text-green-800",
  warning: "border-yellow-200 bg-yellow-100 text-yellow-800",
  error: "border-red-200 bg-red-100 text-red-800",
  info: "border-blue-200 bg-blue-100 text-blue-800"
}

function resolveTypeClass(type: NotificationRecord["type"]) {
  return TYPE_STYLES[type ?? "info"]
}

function formatTime(value: string | null) {
  if (!value) return "Just now"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Just now"

  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return date.toLocaleDateString()
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [quickJumpValue, setQuickJumpValue] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const scrollPositionsRef = useRef<Record<number, number>>({})
  const pageRef = useRef(page)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  const getViewport = useCallback(() => {
    return scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null
  }, [])

  const restoreScroll = useCallback(
    (pageToRestore: number) => {
      const viewport = getViewport()
      if (!viewport) return
      const stored = scrollPositionsRef.current[pageToRestore] ?? 0
      requestAnimationFrame(() => {
        viewport.scrollTop = stored
      })
    },
    [getViewport]
  )

  const recordScroll = useCallback(() => {
    const viewport = getViewport()
    if (!viewport) return
    scrollPositionsRef.current[pageRef.current] = viewport.scrollTop
  }, [getViewport])

  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return

    const handleScroll = () => {
      scrollPositionsRef.current[pageRef.current] = viewport.scrollTop
    }

    viewport.addEventListener("scroll", handleScroll)
    return () => viewport.removeEventListener("scroll", handleScroll)
  }, [getViewport])

  const fetchNotifications = useCallback(
    async (pageToLoad: number) => {
      setLoading(true)
      const from = (pageToLoad - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      try {
        const { data, error, count } = await (supabase as any)
          .from("notifications")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to)

        if (error) {
          throw error
        }

        const items: NotificationRecord[] = data ?? []
        const totalItems = typeof count === "number" ? count : items.length

        setNotifications(items)
        setTotalCount(totalItems)
        setTotalPages(Math.max(1, Math.ceil(totalItems / PAGE_SIZE)))
        setErrorMessage(null)

        try {
          const { count: unreadTotal } = await (supabase as any)
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("read", false)

          if (typeof unreadTotal === "number") {
            setUnreadCount(unreadTotal)
          } else {
            setUnreadCount(items.filter((item) => !item.read).length)
          }
        } catch {
          setUnreadCount(items.filter((item) => !item.read).length)
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
        const fallback = getMockNotificationsPage(pageToLoad, PAGE_SIZE)
        setNotifications(fallback.items as NotificationRecord[])
        setTotalCount(fallback.total)
        setTotalPages(fallback.totalPages)
        setUnreadCount(fallback.unread)
        setErrorMessage(
          "Live notifications are unavailable. Showing the latest cached sample until Supabase reconnects."
        )
      } finally {
        setLoading(false)
        restoreScroll(pageToLoad)
      }
    },
    [restoreScroll, supabase]
  )

  useEffect(() => {
    fetchNotifications(Math.max(1, page))
  }, [fetchNotifications, page])

  useEffect(() => {
    const channel = supabase
      .channel("notification-center")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications"
        },
        (payload) => {
          const newNotification = payload.new as NotificationRecord

          setTotalCount((prev) => {
            const next = prev + 1
            const newTotalPages = Math.max(1, Math.ceil(next / PAGE_SIZE))
            setTotalPages(newTotalPages)
            trackPaginationEvent("notifications", 1, "realtime", {
              pageSize: PAGE_SIZE,
              totalItems: next,
              totalPages: newTotalPages
            })
            return next
          })

          if (!newNotification.read) {
            setUnreadCount((prev) => prev + 1)
          }

          if (pageRef.current === 1) {
            setNotifications((prev) =>
              [newNotification, ...prev].slice(0, PAGE_SIZE)
            )
            scrollPositionsRef.current[1] = 0
          }

          toast({
            title: newNotification.title ?? "New notification",
            description: newNotification.message ?? "",
            variant:
              newNotification.type === "error"
                ? "destructive"
                : "default"
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, toast])

  const changePage = useCallback(
    (targetPage: number, action: PaginationAction) => {
      const safePage = Math.max(1, Math.min(targetPage, totalPages))
      if (safePage === pageRef.current) return

      recordScroll()
      setPage(safePage)
      setQuickJumpValue("")
      trackPaginationEvent("notifications", safePage, action, {
        pageSize: PAGE_SIZE,
        totalItems: totalCount,
        totalPages
      })
    },
    [recordScroll, totalCount, totalPages]
  )

  const handleQuickJump = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const value = Number.parseInt(quickJumpValue, 10)
      if (Number.isNaN(value)) return
      changePage(value, "jump")
    },
    [changePage, quickJumpValue]
  )

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await (supabase as any)
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId)

        if (error) {
          throw error
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      } finally {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    },
    [supabase]
  )

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id)
    if (unreadIds.length === 0) return

    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds)

      if (error) {
        throw error
      }

      toast({ title: "All notifications marked as read" })
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    } finally {
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      )
      setUnreadCount((prev) => Math.max(0, prev - unreadIds.length))
    }
  }, [notifications, supabase, toast])

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((item) => item.id === notificationId)

      try {
        const { error } = await (supabase as any)
          .from("notifications")
          .delete()
          .eq("id", notificationId)

        if (error) {
          throw error
        }
      } catch (error) {
        console.error("Failed to delete notification:", error)
      } finally {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== notificationId)
        )

        if (target && !target.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }

        setTotalCount((prev) => {
          const next = Math.max(0, prev - 1)
          const newTotalPages = Math.max(1, Math.ceil(next / PAGE_SIZE))
          setTotalPages(newTotalPages)

          if (pageRef.current > newTotalPages) {
            setPage(newTotalPages)
          } else {
            fetchNotifications(pageRef.current)
          }

          return next
        })
      }
    },
    [fetchNotifications, notifications, supabase]
  )

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((open) => !open)}
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
        <Card className="absolute right-0 top-12 z-50 w-96 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
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
            {errorMessage ? (
              <div className="mx-4 mb-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                {errorMessage}
              </div>
            ) : null}
            <ScrollArea ref={scrollAreaRef} className="h-80">
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
                  {notifications.map((notification, index) => {
                    const isUnread = !notification.read

                    return (
                      <div key={notification.id}>
                        <div
                          className={cn(
                            "cursor-pointer p-3 transition-colors hover:bg-muted/50",
                            isUnread && "bg-muted/20"
                          )}
                          onClick={() => {
                            if (isUnread) {
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
                                  className={cn(
                                    "text-xs capitalize",
                                    resolveTypeClass(notification.type)
                                  )}
                                >
                                  {notification.type ?? "info"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(notification.created_at)}
                                </span>
                              </div>
                              <p className="text-sm font-medium">
                                {notification.title ?? "Notification"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {notification.message ?? ""}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {isUnread && (
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
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => changePage(1, "first")}
                >
                  First
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1, "previous")}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => changePage(page + 1, "next")}
                >
                  Next
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => changePage(totalPages, "last")}
                >
                  Last
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="mr-1 size-3" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
            <form className="flex items-center gap-2" onSubmit={handleQuickJump}>
              <label className="sr-only" htmlFor="notification-jump">
                Jump to page
              </label>
              <Input
                id="notification-jump"
                type="number"
                min={1}
                max={Math.max(1, totalPages)}
                value={quickJumpValue}
                onChange={(event) => setQuickJumpValue(event.target.value)}
                placeholder="Jump to page"
                className="h-8"
              />
              <Button type="submit" variant="outline" size="sm">
                Go
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
