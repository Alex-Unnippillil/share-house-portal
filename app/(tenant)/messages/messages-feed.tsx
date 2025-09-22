"use client"

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"

import {
  createInitialState,
  createOptimisticMessage,
  messageReducer,
  type MessageRow,
  type MessageStatus,
} from "./message-reducer"

import type { Database } from "@/lib/supabase"

type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"]

type MessagesFeedProps = {
  initialMessages: MessageRow[]
  householdId: string
  threadId: string
  currentUserId: string | null
  initialError?: string
}

const statusCopy: Record<MessageStatus, string> = {
  confirmed: "Sent",
  failed: "Failed to send",
  pending: "Sending…",
}

const statusVariant: Record<MessageStatus, "secondary" | "outline" | "destructive"> = {
  confirmed: "secondary",
  failed: "destructive",
  pending: "outline",
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const formatFileSize = (value?: number) => {
  if (!value || value <= 0) {
    return null
  }

  if (value < 1024) {
    return `${value} B`
  }

  const kb = value / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`
  }

  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

const getClientId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

const buildChannelName = (householdId: string, threadId: string) =>
  `messages-${householdId}-${threadId}`

export default function MessagesFeed({
  initialMessages,
  householdId,
  threadId,
  currentUserId,
  initialError,
}: MessagesFeedProps) {
  const supabase = useSupabaseBrowser()
  const [state, dispatch] = useReducer(messageReducer, initialMessages, createInitialState)
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(initialError ?? null)

  const messages = useMemo(() => state.messages, [state.messages])

  useEffect(() => {
    dispatch({ type: "set", messages: initialMessages })
  }, [initialMessages])

  useEffect(() => {
    setComposerError(initialError ?? null)
  }, [initialError])

  useEffect(() => {
    const channel = supabase
      .channel(buildChannelName(householdId, threadId))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const data = payload.new as MessageRow | null
          if (!data || data.household_id !== householdId) {
            return
          }

          dispatch({ type: "receive", message: data })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const data = payload.new as MessageRow | null
          if (!data || data.household_id !== householdId) {
            return
          }

          dispatch({ type: "update", message: data })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, householdId, threadId])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedBody = body.trim()

      if (!trimmedBody) {
        return
      }

      if (!currentUserId) {
        setComposerError("You need to be signed in to send messages.")
        return
      }

      setComposerError(null)

      const clientId = getClientId()
      const optimistic = createOptimisticMessage({
        clientId,
        body: trimmedBody,
        threadId,
        householdId,
        authorId: currentUserId,
      })

      dispatch({ type: "optimistic-add", message: optimistic })
      setIsSending(true)
      setBody("")

      try {
        const payload: MessageInsert = {
          body: trimmedBody,
          thread_id: threadId,
          household_id: householdId,
          author_id: currentUserId,
          attachments: optimistic.attachments as unknown as MessageInsert["attachments"],
        }

        const { data, error } = await supabase
          .from("messages")
          .insert(payload)
          .select()
          .single()

        if (error || !data) {
          throw error ?? new Error("Message was not returned")
        }

        dispatch({ type: "confirm", clientId, message: data })
      } catch (error) {
        dispatch({ type: "fail", clientId })
        setComposerError(
          error instanceof Error ? error.message : "Unable to send your message."
        )
        setBody(trimmedBody)
      } finally {
        setIsSending(false)
      }
    },
    [body, currentUserId, householdId, supabase, threadId]
  )

  const canSend = Boolean(currentUserId) && body.trim().length > 0 && !isSending

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
        {messages.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
        ) : (
          <ul className="divide-y">
            {messages.map((message) => (
              <li key={message.clientId} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(message.created_at)}
                  </div>
                  <Badge variant={statusVariant[message.status]}>{statusCopy[message.status]}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {message.body}
                </p>
                {message.attachments.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{attachment.name}</span>
                        {formatFileSize(attachment.size) ? (
                          <span>• {formatFileSize(attachment.size)}</span>
                        ) : null}
                        {attachment.contentType ? <span>• {attachment.contentType}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share an update with your household"
          disabled={isSending || !currentUserId}
          className={cn(
            composerError ? "border-destructive focus-visible:ring-destructive" : undefined
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div
            className={cn(
              "min-h-[1rem]",
              composerError ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {composerError ?? (!currentUserId ? "Sign in to send a message." : null)}
          </div>
          <Button type="submit" disabled={!canSend}>
            {isSending ? "Sending…" : "Send message"}
          </Button>
        </div>
      </form>
    </div>
  )
}
