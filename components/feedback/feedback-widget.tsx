"use client"

import * as React from "react"
import { MessageSquare } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const MAX_TRACKED_ENTRIES = 200

const consoleLevels = ["log", "info", "warn", "error", "debug"] as const

type ConsoleLevel = (typeof consoleLevels)[number]
type ConsoleMethod = (...args: Parameters<typeof console.log>) => void

type ConsoleEntry = {
  level: ConsoleLevel
  message: string
  timestamp: string
}

type NetworkEntry = {
  method: string
  url: string
  status?: number
  ok?: boolean
  durationMs?: number
  error?: string
  timestamp: string
}

type Attachment = {
  filename: string
  content: string
  contentType: string
}

declare global {
  interface XMLHttpRequest {
    __feedbackMeta?: {
      method?: string
      url?: string
    }
  }
}

const serializeValue = (value: unknown) => {
  if (typeof value === "string") {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const encodeAttachmentContent = (payload: unknown) => {
  const serialized =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)

  const encoder = new TextEncoder()
  const bytes = encoder.encode(serialized)
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

export function FeedbackWidget() {
  const [open, setOpen] = React.useState(false)
  const [notes, setNotes] = React.useState("")
  const [consoleLogs, setConsoleLogs] = React.useState<ConsoleEntry[]>([])
  const [networkEntries, setNetworkEntries] = React.useState<NetworkEntry[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const originalConsole: Partial<Record<ConsoleLevel, ConsoleMethod>> = {}

    consoleLevels.forEach((level) => {
      const original = console[level] as ConsoleMethod
      originalConsole[level] = original

      console[level] = ((...args: unknown[]) => {
        setConsoleLogs((previous) => {
          const entry: ConsoleEntry = {
            level,
            message: args.map(serializeValue).join(" "),
            timestamp: new Date().toISOString(),
          }

          const nextEntries = [...previous, entry]
          return nextEntries.slice(-MAX_TRACKED_ENTRIES)
        })

        if (typeof original === "function") {
          original.apply(console, args as never)
        }
      }) as ConsoleMethod
    })

    const originalFetch = window.fetch.bind(window)

    window.fetch = (async (...args) => {
      const [input, init] = args
      const method =
        (init && typeof init === "object" && "method" in init && typeof init.method === "string"
          ? init.method
          : undefined) || (input instanceof Request ? input.method : "GET")
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : typeof input === "object" && input !== null && "url" in input
              ? String((input as { url: unknown }).url)
              : "unknown"
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now()

      try {
        const response = await originalFetch(...args)
        const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now()
        const duration = Math.round(finishedAt - startedAt)

        setNetworkEntries((previous) => {
          const entry: NetworkEntry = {
            method,
            url,
            status: response.status,
            ok: response.ok,
            durationMs: duration,
            timestamp: new Date().toISOString(),
          }
          const nextEntries = [...previous, entry]
          return nextEntries.slice(-MAX_TRACKED_ENTRIES)
        })

        return response
      } catch (error) {
        const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now()
        const duration = Math.round(finishedAt - startedAt)

        setNetworkEntries((previous) => {
          const entry: NetworkEntry = {
            method,
            url,
            ok: false,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }
          const nextEntries = [...previous, entry]
          return nextEntries.slice(-MAX_TRACKED_ENTRIES)
        })

        throw error
      }
    }) as typeof window.fetch

    const originalXhrOpen = XMLHttpRequest.prototype.open
    const originalXhrSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      this.__feedbackMeta = {
        method,
        url: typeof url === "string" ? url : url.toString(),
      }

      return originalXhrOpen.apply(this, [method, url, ...rest])
    }

    XMLHttpRequest.prototype.send = function (...args) {
      const xhr = this
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now()

      xhr.addEventListener("loadend", () => {
        const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now()
        const duration = Math.round(finishedAt - startedAt)

        setNetworkEntries((previous) => {
          const entry: NetworkEntry = {
            method: xhr.__feedbackMeta?.method || "GET",
            url: xhr.__feedbackMeta?.url || "unknown",
            status: xhr.status || undefined,
            ok: xhr.status ? xhr.status >= 200 && xhr.status < 400 : undefined,
            durationMs: duration,
            timestamp: new Date().toISOString(),
          }
          const nextEntries = [...previous, entry]
          return nextEntries.slice(-MAX_TRACKED_ENTRIES)
        })
      })

      return originalXhrSend.apply(this, args as Parameters<typeof originalXhrSend>)
    }

    return () => {
      consoleLevels.forEach((level) => {
        const original = originalConsole[level]
        if (original) {
          console[level] = original
        }
      })

      window.fetch = originalFetch
      XMLHttpRequest.prototype.open = originalXhrOpen
      XMLHttpRequest.prototype.send = originalXhrSend
    }
  }, [])

  const attachments = React.useMemo<Attachment[]>(() => {
    if (typeof window === "undefined") {
      return []
    }

    return [
      {
        filename: `console-logs-${Date.now()}.json`,
        content: encodeAttachmentContent(consoleLogs),
        contentType: "application/json",
      },
      {
        filename: `network-har-${Date.now()}.json`,
        content: encodeAttachmentContent(networkEntries),
        contentType: "application/json",
      },
    ]
  }, [consoleLogs, networkEntries])

  const submitFeedback = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (typeof window === "undefined") {
        return
      }

      setIsSubmitting(true)
      setStatusMessage(null)
      setErrorMessage(null)

      try {
        const payload = {
          notes: notes.trim() || undefined,
          consoleLogs,
          networkEntries,
          attachments,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }

        const response = await fetch("/api/support/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null)
          throw new Error(errorPayload?.error || "Unable to submit feedback right now.")
        }

        setStatusMessage("Thanks for the report! Our support team has the diagnostic bundle.")
        setNotes("")
        setTimeout(() => setOpen(false), 1500)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong while sending feedback."
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [notes, consoleLogs, networkEntries, attachments]
  )

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            aria-label="Open support feedback form"
            className="shadow-lg"
            size="lg"
            variant="secondary"
          >
            <MessageSquare aria-hidden="true" className="mr-2 size-4" />
            <span>Feedback</span>
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby="feedback-dialog-description" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send diagnostics to support</DialogTitle>
            <DialogDescription id="feedback-dialog-description">
              Include a quick note and we&apos;ll bundle your console logs and recent network activity so our support team can troubleshoot quickly.
            </DialogDescription>
          </DialogHeader>
          <form aria-label="Support feedback form" className="space-y-4" onSubmit={submitFeedback}>
            <div className="space-y-2">
              <Label htmlFor="feedback-notes">Tell us what&apos;s happening</Label>
              <Textarea
                id="feedback-notes"
                minLength={3}
                placeholder="Share any steps to reproduce or context we should know."
                rows={6}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Console entries captured: {consoleLogs.length}. Network requests captured: {networkEntries.length}.
              </p>
            </div>
            {statusMessage ? (
              <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
                {statusMessage}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <DialogFooter>
              <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button isLoading={isSubmitting} type="submit">
                Send to support
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
