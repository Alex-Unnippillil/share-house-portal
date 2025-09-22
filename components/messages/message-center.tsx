"use client"

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { formatDistanceToNow } from "date-fns"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { trackPaginationEvent, type PaginationAction } from "@/lib/analytics"
import { getMockMessagesPage } from "@/lib/mock-data/messages"
import type { Tables } from "@/lib/supabase"
import { createClient } from "@/utils/supabase-browser"

const PAGE_SIZE = 12

type MessageRecord = Tables<"messages">

function formatTimestamp(value: string | null) {
  if (!value) return "unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "unknown"
  return formatDistanceToNow(date, { addSuffix: true })
}

function formatRole(role: MessageRecord["author_role"]) {
  if (!role) return "Roommate"
  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function MessageCenter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const initialPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const [page, setPage] = useState(Number.isNaN(initialPage) ? 1 : initialPage)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [quickJumpValue, setQuickJumpValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pageRef = useRef(page)
  const windowScrollPositionsRef = useRef<Record<number, number>>({})

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    const urlPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
    if (!Number.isNaN(urlPage) && urlPage !== page) {
      setPage(Math.max(1, urlPage))
    }
  }, [page, searchParams])

  const restoreWindowScroll = useCallback((pageToRestore: number) => {
    if (typeof window === "undefined") return
    const stored = windowScrollPositionsRef.current[pageToRestore] ?? 0
    requestAnimationFrame(() => {
      window.scrollTo({ top: stored })
    })
  }, [])

  const fetchMessages = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true)
      setErrorMessage(null)

      const from = (pageToLoad - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      try {
        const { data, error, count } = await (supabase as any)
          .from("messages")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to)

        if (error) {
          throw error
        }

        const items: MessageRecord[] = data ?? []
        const totalItems = typeof count === "number" ? count : items.length

        setMessages(items)
        setTotalCount(totalItems)
        setTotalPages(Math.max(1, Math.ceil(totalItems / PAGE_SIZE)))
      } catch (error) {
        console.error("Failed to load messages:", error)
        const fallback = getMockMessagesPage(pageToLoad, PAGE_SIZE)
        setMessages(fallback.items)
        setTotalCount(fallback.total)
        setTotalPages(fallback.totalPages)
        setErrorMessage(
          "Realtime message history is temporarily unavailable. Showing the latest cached sample instead."
        )
      } finally {
        setIsLoading(false)
        restoreWindowScroll(pageToLoad)
      }
    },
    [restoreWindowScroll, supabase]
  )

  useEffect(() => {
    fetchMessages(Math.max(1, page))
  }, [fetchMessages, page])

  const updateRoute = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (targetPage <= 1) {
        params.delete("page")
      } else {
        params.set("page", String(targetPage))
      }

      const nextPath = params.size ? `${pathname}?${params.toString()}` : pathname
      router.replace(nextPath, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const changePage = useCallback(
    (targetPage: number, action: PaginationAction) => {
      const nextPage = Math.max(1, Math.min(targetPage, totalPages))
      if (nextPage === pageRef.current) {
        return
      }

      if (typeof window !== "undefined") {
        windowScrollPositionsRef.current[pageRef.current] = window.scrollY
      }

      setQuickJumpValue("")
      setPage(nextPage)
      updateRoute(nextPage)
      trackPaginationEvent("messages", nextPage, action, {
        pageSize: PAGE_SIZE,
        totalPages,
        totalItems: totalCount
      })
    },
    [totalPages, totalCount, updateRoute]
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roommate message history</CardTitle>
        <CardDescription>
          Cursor-friendly pagination keeps long-running conversations navigable without the drawbacks of infinite scroll.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
            {errorMessage}
          </div>
        ) : null}
        {!isLoading && messages.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            Showing
            {" "}
            {Math.min(totalCount, (page - 1) * PAGE_SIZE + 1)}
            –
            {Math.min(totalCount, (page - 1) * PAGE_SIZE + messages.length)} of {totalCount} messages
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-lg border border-border/60 bg-muted/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="mt-3 h-3 w-full rounded bg-muted" />
                <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No messages yet — start a thread to coordinate with your roommates.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const subject =
                typeof message.metadata === "object" && message.metadata
                  ? (message.metadata as Record<string, unknown>)["subject"]
                  : null

              return (
                <div key={message.id} className="rounded-lg border bg-background p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="uppercase tracking-wide">
                        {typeof subject === "string"
                          ? subject
                          : message.thread_id ?? "General"}
                      </Badge>
                      <Badge variant="secondary">{formatRole(message.author_role)}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.created_at)}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {message.author_name ?? "Unknown roommate"}
                    </p>
                    <p className="text-sm text-muted-foreground">{message.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between">
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
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
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
        <form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={handleQuickJump}
        >
          <label className="sr-only" htmlFor="message-jump">
            Jump to page
          </label>
          <Input
            id="message-jump"
            type="number"
            min={1}
            max={Math.max(1, totalPages)}
            value={quickJumpValue}
            onChange={(event) => setQuickJumpValue(event.target.value)}
            placeholder="Jump to page"
            className="h-9 w-full max-w-[130px]"
          />
          <Button type="submit" variant="outline" size="sm">
            Go
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
