"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase-browser"

interface HouseholdMessage {
  id: string
  content: string
  created_at: string
  household_id: string | null
  author_id: string | null
  author_name: string | null
  optimistic?: boolean
}

interface AuthorInfo {
  id: string
  name: string
}

function sortMessages(messages: HouseholdMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 animate-pulse rounded-full bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-56 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: HouseholdMessage
  isOwn: boolean
}) {
  const timestamp = useMemo(() => {
    try {
      return new Date(message.created_at).toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      return message.created_at
    }
  }, [message.created_at])

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}> 
      <div
        className={cn(
          "max-w-xl rounded-lg border bg-card px-4 py-3 shadow-sm",
          isOwn ? "bg-primary/5" : "bg-background",
          message.optimistic && "opacity-70",
        )}
      >
        <div className="flex items-baseline gap-2 text-sm font-medium text-foreground">
          <span>{isOwn ? "You" : message.author_name ?? "Housemate"}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {message.content}
        </p>
      </div>
    </div>
  )
}

export default function HouseholdMessagesPage() {
  const supabase = useMemo(createClient, [])
  const searchParams = useSearchParams()
  const resolvedHouseholdId = useMemo(
    () => searchParams?.get("householdId") ?? "household-default",
    [searchParams],
  )

  const [messages, setMessages] = useState<HouseholdMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [author, setAuthor] = useState<AuthorInfo | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (!active) return

      if (authError) {
        console.error("Failed to load user", authError)
        return
      }

      if (!user) {
        return
      }

      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        "You"

      setAuthor({ id: user.id, name: displayName })

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      if (!active) return

      if (!profileError && profile?.full_name) {
        setAuthor({ id: user.id, name: profile.full_name })
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setMessages([])

    async function loadMessages() {
      const { data, error: fetchError } = await supabase
        .from("messages" as any)
        .select("id, content, created_at, household_id, author_id, author_name")
        .eq("household_id", resolvedHouseholdId)
        .order("created_at", { ascending: true })
        .limit(200)

      if (cancelled) return

      if (fetchError) {
        console.error("Failed to load messages", fetchError)
        setError("We couldn't load the message feed. Please try again.")
        setMessages([])
      } else {
        setMessages(sortMessages((data as HouseholdMessage[]) ?? []))
      }

      setLoading(false)
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [resolvedHouseholdId, supabase])

  useEffect(() => {
    const channelName = `household:${resolvedHouseholdId}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `household_id=eq.${resolvedHouseholdId}`,
        },
        payload => {
          const newMessage = payload.new as HouseholdMessage
          setMessages(prev => {
            if (prev.some(message => message.id === newMessage.id)) {
              return prev
            }

            return sortMessages([...prev, newMessage])
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `household_id=eq.${resolvedHouseholdId}`,
        },
        payload => {
          const updatedMessage = payload.new as HouseholdMessage
          setMessages(prev =>
            sortMessages(
              prev.map(message =>
                message.id === updatedMessage.id ? { ...message, ...updatedMessage } : message,
              ),
            ),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resolvedHouseholdId, supabase])

  useEffect(() => {
    const container = feedRef.current
    if (!container) return

    container.scrollTo({ top: container.scrollHeight })
  }, [messages])

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim()) return

    setError(null)
    const content = input.trim()
    const optimisticId = `temp-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
    const optimisticMessage: HouseholdMessage = {
      id: optimisticId,
      content,
      created_at: new Date().toISOString(),
      household_id: resolvedHouseholdId,
      author_id: author?.id ?? null,
      author_name: author?.name ?? "You",
      optimistic: true,
    }

    setMessages(prev => sortMessages([...prev, optimisticMessage]))
    setInput("")
    setIsSending(true)

    const { data, error: insertError } = await supabase
      .from("messages" as any)
      .insert({
        content,
        household_id: resolvedHouseholdId,
        author_id: author?.id ?? null,
        author_name: author?.name ?? null,
      })
      .select("id, content, created_at, household_id, author_id, author_name")
      .single()

    if (insertError || !data) {
      console.error("Failed to send message", insertError)
      setError("Your message could not be sent. Please try again.")
      setMessages(prev => prev.filter(message => message.id !== optimisticId))
      setInput(content)
    } else {
      const savedMessage = data as HouseholdMessage
      setMessages(prev =>
        sortMessages(
          prev.map(message =>
            message.id === optimisticId
              ? { ...savedMessage, optimistic: false }
              : message,
          ),
        ),
      )
    }

    setIsSending(false)
  }

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <CardTitle>Household messages</CardTitle>
          <CardDescription>
            Chat with roommates and property managers in real-time. Messages update instantly for everyone in your household.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[70vh] flex-col gap-4 p-0">
          <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-6 py-4">
            {loading && (
              <div className="space-y-4">
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <p>No messages yet. Start the conversation below.</p>
              </div>
            )}

            {!loading &&
              messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={Boolean(author && message.author_id === author.id)}
                />
              ))}
          </div>

          <div className="border-t bg-background px-6 py-4">
            {error && (
              <p className="mb-3 text-sm text-destructive">{error}</p>
            )}
            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
              <Textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Share an update with the house..."
                rows={3}
                className="resize-none"
                disabled={isSending}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Connected to channel: {resolvedHouseholdId}</span>
                <Button type="submit" disabled={isSending || !input.trim()}>
                  {isSending ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
