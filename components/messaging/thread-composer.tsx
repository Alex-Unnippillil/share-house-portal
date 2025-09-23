"use client"

import { Loader2, Paperclip } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import type { ChangeEvent, ClipboardEvent } from "react"

import { LinkPreviewCard } from "@/components/messaging/link-preview-card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { LinkPreviewData } from "@/types/link-preview"

const URL_PATTERN = /(https?:\/\/[^\s]+)/i

const extractFirstUrl = (input: string) => {
  const match = input.match(URL_PATTERN)
  return match ? match[0] : null
}

const createEmptyPreview = (url: string): LinkPreviewData => {
  let siteName: string | null = null
  try {
    siteName = new URL(url).hostname
  } catch (error) {
    siteName = null
  }

  return {
    url,
    title: null,
    description: null,
    image: null,
    favicon: null,
    siteName,
  }
}

export const ThreadComposer = () => {
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState<LinkPreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null)

  const hasMessage = message.trim().length > 0

  const fetchPreview = useCallback(async (url: string) => {
    const normalized = url.trim()
    if (!normalized || normalized === lastPreviewUrl) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalized }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const payload = (await response.json()) as {
        preview?: LinkPreviewData
      }

      if (payload?.preview) {
        setPreview(payload.preview)
        setLastPreviewUrl(payload.preview.url)
      } else {
        const fallback = createEmptyPreview(normalized)
        setPreview(fallback)
        setLastPreviewUrl(normalized)
      }
    } catch (requestError) {
      setError("We couldn't generate a preview for this link, but you can still send it.")
      const fallback = createEmptyPreview(normalized)
      setPreview(fallback)
      setLastPreviewUrl(normalized)
    } finally {
      setIsLoading(false)
    }
  }, [lastPreviewUrl])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value
      setMessage(value)

      const urlInMessage = extractFirstUrl(value)
      if (urlInMessage) {
        void fetchPreview(urlInMessage)
      } else {
        setPreview(null)
        setLastPreviewUrl(null)
      }
    },
    [fetchPreview]
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = event.clipboardData?.getData("text") ?? ""
      const url = extractFirstUrl(pasted)
      if (url) {
        void fetchPreview(url)
      }
    },
    [fetchPreview]
  )

  const handleRemovePreview = useCallback(() => {
    setPreview(null)
    setLastPreviewUrl(null)
  }, [])

  const handleSend = useCallback(() => {
    setMessage("")
    setPreview(null)
    setLastPreviewUrl(null)
    setError(null)
  }, [])

  const helperText = useMemo(() => {
    if (isLoading) {
      return "Fetching link preview…"
    }

    if (error) {
      return error
    }

    if (preview) {
      return "Preview added — roommates will see the link details in the thread."
    }

    return "Paste a link to add a preview card to your update."
  }, [error, isLoading, preview])

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border/70 bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Share an update</p>
          <p className="text-xs text-muted-foreground">Drop a note or paste a link for the house.</p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!hasMessage}
          onClick={handleSend}
          className="sm:mt-1"
        >
          Post message
        </Button>
      </div>

      <div className="space-y-3">
        <Textarea
          value={message}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="Type your message. Paste a link to generate a preview."
          className="min-h-[120px]"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Paperclip className="size-4" aria-hidden />
            Link previews keep context handy for roommates.
          </span>
          {isLoading ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Generating preview…
            </span>
          ) : null}
          <span className={cn("text-muted-foreground", error && "text-destructive")}>{helperText}</span>
        </div>
      </div>

      {preview ? (
        <LinkPreviewCard
          preview={preview}
          onRemove={handleRemovePreview}
          className="border-border bg-background"
        />
      ) : null}
    </div>
  )
}

export default ThreadComposer
