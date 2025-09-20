"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Paperclip, Pin, PinOff, Shield, Trash2, Undo2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"

import type { Database, Json } from "@/lib/supabase"
import type { ListTenantMessagesResult, TenantMessageWithRelations, TenantMembershipRecord } from "./actions"
import { createTenantMessage, getTenantMessageById, listTenantMessages, moderateTenantMessage, subscribeToTenantMessages } from "./actions"

const attachmentSchema = z.string().url("Enter a valid URL")

const composerSchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(2000, "Keep messages under 2,000 characters"),
  attachments: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim()),
})

type ComposerValues = z.infer<typeof composerSchema>

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "avatar_url" | "role">

type MembershipWithRelations = TenantMembershipRecord & {
  property: Pick<Database["public"]["Tables"]["properties"]["Row"], "id" | "name"> | null
  unit: Pick<Database["public"]["Tables"]["property_units"]["Row"], "id" | "label"> | null
}

type MessageAttachment = {
  url: string
  name?: string | null
  type?: string | null
}

type ClientMessage = TenantMessageWithRelations & {
  clientKey: string
  optimistic?: boolean
}

type MessageBoardClientProps = {
  profile: Profile
  memberships: MembershipWithRelations[]
  initialThreadId: string
  initialData: ListTenantMessagesResult
  allowModeration?: boolean
  initialIncludeRemoved?: boolean
}

function toAttachments(value: Json): MessageAttachment[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }
      const record = item as Record<string, unknown>
      if (typeof record.url !== "string") {
        return null
      }
      return {
        url: record.url,
        name: typeof record.name === "string" ? record.name : null,
        type: typeof record.type === "string" ? record.type : null,
      }
    })
    .filter((entry): entry is MessageAttachment => Boolean(entry))
}

function withClientMeta(message: TenantMessageWithRelations): ClientMessage {
  return {
    ...message,
    clientKey: `${message.id}`,
    optimistic: false,
  }
}

function initials(name?: string | null) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] ?? "?") + (parts[parts.length - 1]![0] ?? "?")
}

const STAFF_ROLES = new Set(["admin", "staff", "manager"])

export default function MessageBoardClient({
  profile,
  memberships,
  initialThreadId,
  initialData,
  allowModeration = false,
  initialIncludeRemoved = false,
}: MessageBoardClientProps) {
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()
  const [currentThreadId, setCurrentThreadId] = useState(initialThreadId)
  const [pinnedMessages, setPinnedMessages] = useState<ClientMessage[]>(() =>
    initialData.pinned.map(withClientMeta)
  )
  const [messages, setMessages] = useState<ClientMessage[]>(() =>
    initialData.messages.map(withClientMeta)
  )
  const [nextCursor, setNextCursor] = useState<string | null>(initialData.nextCursor)
  const [includeRemoved, setIncludeRemoved] = useState(initialIncludeRemoved)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, startRefresh] = useTransition()
  const [isPosting, setIsPosting] = useState(false)

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.id === currentThreadId) ?? memberships[0]!,
    [currentThreadId, memberships]
  )

  const canModerate = allowModeration || STAFF_ROLES.has(profile.role ?? "") || STAFF_ROLES.has(currentMembership.role ?? "")

  useEffect(() => {
    if (!canModerate && includeRemoved) {
      setIncludeRemoved(false)
    }
  }, [canModerate, includeRemoved])

  const form = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      body: "",
      attachments: "",
    },
  })

  const refreshThread = useCallback(() => {
    startRefresh(async () => {
      try {
        const data = await listTenantMessages({
          propertyId: currentMembership.property_id,
          unitId: currentMembership.unit_id,
          includeRemoved: includeRemoved && canModerate,
        })
        setPinnedMessages(data.pinned.map(withClientMeta))
        setMessages(data.messages.map(withClientMeta))
        setNextCursor(data.nextCursor)
      } catch (error) {
        console.error(error)
        toast({
          title: "Unable to refresh thread",
          description: error instanceof Error ? error.message : "Unexpected error",
          variant: "destructive",
        })
      }
    })
  }, [canModerate, currentMembership.property_id, currentMembership.unit_id, includeRemoved, toast])

  useEffect(() => {
    setPinnedMessages(initialData.pinned.map(withClientMeta))
    setMessages(initialData.messages.map(withClientMeta))
    setNextCursor(initialData.nextCursor)
  }, [initialData])

  useEffect(() => {
    const abortController = new AbortController()
    let isMounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function subscribe() {
      try {
        const config = await subscribeToTenantMessages({
          propertyId: currentMembership.property_id,
          unitId: currentMembership.unit_id,
        })

        if (!isMounted) {
          return
        }

        channel = supabase
          .channel(config.channel)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: config.schema,
              table: config.table,
              filter: config.filter,
            },
            async (payload) => {
              if (abortController.signal.aborted) return
              const recordId = (payload.new as { id?: number } | null)?.id ??
                (payload.old as { id?: number } | null)?.id
              if (!recordId) return

              try {
                if (payload.eventType === "DELETE") {
                  setPinnedMessages((prev) => prev.filter((message) => message.id !== recordId))
                  setMessages((prev) => prev.filter((message) => message.id !== recordId))
                  return
                }

                const latest = await getTenantMessageById(recordId)
                if (!latest) {
                  setPinnedMessages((prev) => prev.filter((message) => message.id !== recordId))
                  setMessages((prev) => prev.filter((message) => message.id !== recordId))
                  return
                }

                setPinnedMessages((prev) => {
                  const existingIndex = prev.findIndex((message) => message.id === latest.id)
                  if (latest.removed) {
                    if (existingIndex === -1) return prev
                    const clone = [...prev]
                    clone.splice(existingIndex, 1)
                    return clone
                  }

                  if (!latest.pinned) {
                    if (existingIndex === -1) return prev
                    const clone = [...prev]
                    clone.splice(existingIndex, 1)
                    return clone
                  }

                  const nextMessage: ClientMessage = {
                    ...latest,
                    clientKey: existingIndex >= 0 ? prev[existingIndex]!.clientKey : `${latest.id}`,
                    optimistic: false,
                  }

                  if (existingIndex >= 0) {
                    const clone = [...prev]
                    clone[existingIndex] = nextMessage
                    return clone
                  }

                  return [nextMessage, ...prev]
                })

                setMessages((prev) => {
                  const existingIndex = prev.findIndex((message) => message.id === latest.id)

                  if (latest.removed) {
                    if (existingIndex === -1) return prev
                    const clone = [...prev]
                    clone.splice(existingIndex, 1)
                    return clone
                  }

                  if (latest.pinned) {
                    if (existingIndex === -1) return prev
                    const clone = [...prev]
                    clone.splice(existingIndex, 1)
                    return clone
                  }

                  const nextMessage: ClientMessage = {
                    ...latest,
                    clientKey: existingIndex >= 0 ? prev[existingIndex]!.clientKey : `${latest.id}`,
                    optimistic: false,
                  }

                  if (existingIndex >= 0) {
                    const clone = [...prev]
                    clone[existingIndex] = nextMessage
                    return clone
                  }

                  return [nextMessage, ...prev]
                })
              } catch (error) {
                console.error("Realtime handler error", error)
              }
            }
          )
          .subscribe()
      } catch (error) {
        console.error(error)
        toast({
          title: "Realtime unavailable",
          description: error instanceof Error ? error.message : "Unable to subscribe to updates",
          variant: "destructive",
        })
      }
    }

    subscribe()

    return () => {
      isMounted = false
      abortController.abort()
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentMembership.property_id, currentMembership.unit_id, supabase, toast])

  useEffect(() => {
    if (!includeRemoved) {
      setPinnedMessages((prev) => prev.filter((message) => !message.removed))
      setMessages((prev) => prev.filter((message) => !message.removed))
    } else if (canModerate) {
      refreshThread()
    }
  }, [includeRemoved, canModerate, refreshThread])

  const onSubmit = form.handleSubmit(async (values) => {
    const attachments = (values.attachments ?? "")
      .split(/\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)

    const invalid = attachments.find((url) => !attachmentSchema.safeParse(url).success)
    if (invalid) {
      form.setError("attachments", { message: "One or more attachment links are invalid" })
      return
    }

    const attachmentPayload: MessageAttachment[] = attachments.map((url) => ({ url }))
    const now = new Date().toISOString()
    const clientKey = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    const optimisticMessage: ClientMessage = {
      id: Number.MIN_SAFE_INTEGER + Math.floor(Math.random() * 1000),
      clientKey,
      optimistic: true,
      created_at: now,
      updated_at: now,
      property_id: currentMembership.property_id,
      unit_id: currentMembership.unit_id,
      author_id: profile.id,
      body: values.body,
      attachments: attachmentPayload as unknown as Json,
      pinned: false,
      pinned_at: null,
      pinned_by: null,
      removed: false,
      removed_at: null,
      removed_by: null,
      moderation_note: null,
      updated_by: profile.id,
      author: {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      },
      property: currentMembership.property,
      unit: currentMembership.unit,
    }

    setMessages((prev) => [optimisticMessage, ...prev])
    setIsPosting(true)

    try {
      const inserted = await createTenantMessage({
        propertyId: currentMembership.property_id,
        unitId: currentMembership.unit_id ?? null,
        body: values.body,
        attachments: attachmentPayload,
      })

      setMessages((prev) =>
        prev.map((message) =>
          message.clientKey === clientKey
            ? { ...inserted, clientKey, optimistic: false }
            : message
        )
      )
      form.reset()
    } catch (error) {
      console.error(error)
      setMessages((prev) => prev.filter((message) => message.clientKey !== clientKey))
      toast({
        title: "Could not post message",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setIsPosting(false)
    }
  })

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return
    setIsLoadingMore(true)
    try {
      const data = await listTenantMessages({
        propertyId: currentMembership.property_id,
        unitId: currentMembership.unit_id,
        cursor: nextCursor,
        includeRemoved: includeRemoved && canModerate,
      })
      setMessages((prev) => [...prev, ...data.messages.map(withClientMeta)])
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to load more messages",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [canModerate, currentMembership.property_id, currentMembership.unit_id, includeRemoved, nextCursor, toast])

  const handleThreadChange = useCallback(
    (value: string) => {
      setCurrentThreadId(value)
      setMessages([])
      setPinnedMessages([])
      setNextCursor(null)
      startRefresh(async () => {
        try {
          const membership = memberships.find((item) => item.id === value)
          if (!membership) return
          const data = await listTenantMessages({
            propertyId: membership.property_id,
            unitId: membership.unit_id,
            includeRemoved: includeRemoved && canModerate,
          })
          setPinnedMessages(data.pinned.map(withClientMeta))
          setMessages(data.messages.map(withClientMeta))
          setNextCursor(data.nextCursor)
        } catch (error) {
          console.error(error)
          toast({
            title: "Unable to load thread",
            description: error instanceof Error ? error.message : "Unexpected error",
            variant: "destructive",
          })
        }
      })
    },
    [canModerate, includeRemoved, memberships, startRefresh, toast]
  )

  const handleModeration = useCallback(
    async (message: ClientMessage, action: "pin" | "unpin" | "remove" | "restore") => {
      if (!canModerate || !Number.isFinite(message.id)) return
      try {
        const updates =
          action === "pin"
            ? { pinned: true }
            : action === "unpin"
              ? { pinned: false }
              : action === "remove"
                ? { removed: true }
                : { removed: false }

        const updated = await moderateTenantMessage({
          messageId: message.id as number,
          ...updates,
        })
        setPinnedMessages((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === updated.id)
          if (updated.removed) {
            if (existingIndex === -1) return prev
            const clone = [...prev]
            clone.splice(existingIndex, 1)
            return clone
          }
          if (!updated.pinned) {
            if (existingIndex === -1) return prev
            const clone = [...prev]
            clone.splice(existingIndex, 1)
            return clone
          }
          const nextMessage: ClientMessage = {
            ...updated,
            clientKey: existingIndex >= 0 ? prev[existingIndex]!.clientKey : `${updated.id}`,
            optimistic: false,
          }
          if (existingIndex >= 0) {
            const clone = [...prev]
            clone[existingIndex] = nextMessage
            return clone
          }
          return [nextMessage, ...prev]
        })
        setMessages((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === updated.id)
          if (updated.removed) {
            if (existingIndex === -1) return prev
            const clone = [...prev]
            clone.splice(existingIndex, 1)
            return clone
          }
          if (updated.pinned) {
            if (existingIndex === -1) return prev
            const clone = [...prev]
            clone.splice(existingIndex, 1)
            return clone
          }
          const nextMessage: ClientMessage = {
            ...updated,
            clientKey: existingIndex >= 0 ? prev[existingIndex]!.clientKey : `${updated.id}`,
            optimistic: false,
          }
          if (existingIndex >= 0) {
            const clone = [...prev]
            clone[existingIndex] = nextMessage
            return clone
          }
          return [nextMessage, ...prev]
        })
      } catch (error) {
        console.error(error)
        toast({
          title: "Moderation failed",
          description: error instanceof Error ? error.message : "Unexpected error",
          variant: "destructive",
        })
        refreshThread()
      }
    },
    [canModerate, refreshThread, toast]
  )

  const threadName = `${currentMembership.property?.name ?? "Property"}${
    currentMembership.unit?.label ? ` • ${currentMembership.unit?.label}` : ""
  }`

  return (
    <Card className="space-y-6">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-2xl">Community Message Board</CardTitle>
          <p className="text-sm text-muted-foreground">Share updates with neighbors and stay informed in real time.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={currentThreadId} onValueChange={handleThreadChange} disabled={isRefreshing}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a thread" />
            </SelectTrigger>
            <SelectContent>
              {memberships.map((membership) => (
                <SelectItem key={membership.id} value={membership.id}>
                  {membership.property?.name ?? "Property"}
                  {membership.unit?.label ? ` • ${membership.unit?.label}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canModerate ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={includeRemoved ? "default" : "outline"} className="cursor-pointer" onClick={() => setIncludeRemoved((prev) => !prev)}>
                {includeRemoved ? "Showing removed" : "Hide removed"}
              </Badge>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section aria-labelledby="thread-title" className="space-y-6">
          <div className="rounded-md border bg-muted/30 p-4">
            <h2 id="thread-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {threadName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Messages are visible to residents in this property thread. Attach helpful links or resources to keep everyone aligned.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Share an update, ask a question, or welcome a new neighbor..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment links</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        placeholder="https://example.com/flyer.pdf"
                      />
                    </FormControl>
                    <FormDescription>Optional. Separate multiple links with commas or line breaks.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isPosting || isRefreshing}>
                  {isPosting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Post message
                </Button>
                <span className="text-sm text-muted-foreground">Your update will publish instantly for everyone in this thread.</span>
              </div>
            </form>
          </Form>
        </section>

        {pinnedMessages.length ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Pin className="size-4" /> Pinned
            </div>
            <div className="space-y-3">
              {pinnedMessages.map((message) => (
                <MessageItem
                  key={message.clientKey}
                  message={message}
                  profile={profile}
                  canModerate={canModerate}
                  onModerate={handleModeration}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Latest messages</div>
            {isRefreshing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Refreshing
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Be the first to start the conversation for this thread.
              </p>
            ) : (
              messages.map((message) => (
                <MessageItem
                  key={message.clientKey}
                  message={message}
                  profile={profile}
                  canModerate={canModerate}
                  onModerate={handleModeration}
                />
              ))
            )}
          </div>
          {nextCursor ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Load earlier messages
              </Button>
            </div>
          ) : null}
        </section>
      </CardContent>
    </Card>
  )
}

type MessageItemProps = {
  message: ClientMessage
  profile: Profile
  canModerate: boolean
  onModerate: (message: ClientMessage, action: "pin" | "unpin" | "remove" | "restore") => Promise<void>
}

function MessageItem({ message, profile, canModerate, onModerate }: MessageItemProps) {
  const attachments = useMemo(() => toAttachments(message.attachments), [message.attachments])
  const createdLabel = useMemo(
    () => formatDistanceToNow(new Date(message.created_at), { addSuffix: true }),
    [message.created_at]
  )

  const isAuthor = profile.id === message.author_id
  const isRemoved = message.removed

  return (
    <article
      className={cn(
        "rounded-lg border bg-background p-4 shadow-sm",
        message.optimistic && "opacity-60",
        isRemoved && "border-destructive/40 bg-destructive/10"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 gap-3">
          <Avatar className="size-10">
            <AvatarImage src={message.author?.avatar_url ?? undefined} alt={message.author?.full_name ?? "Tenant"} />
            <AvatarFallback>{initials(message.author?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{message.author?.full_name ?? "Tenant"}</span>
              <span className="text-xs text-muted-foreground">{createdLabel}</span>
              {message.pinned ? (
                <Badge variant="secondary" className="gap-1">
                  <Pin className="size-3" /> Pinned
                </Badge>
              ) : null}
              {isAuthor ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Shield className="size-3" /> You
                </Badge>
              ) : null}
              {isRemoved ? (
                <Badge variant="destructive" className="gap-1">
                  <Trash2 className="size-3" /> Removed
                </Badge>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {message.body}
            </p>
            {attachments.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {attachments.map((attachment, index) => (
                  <li key={`${message.clientKey}-attachment-${index}`} className="flex items-center gap-2">
                    <Paperclip className="size-3 text-muted-foreground" />
                    <a
                      className="truncate text-primary underline"
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {attachment.name ?? attachment.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {canModerate && !message.optimistic ? (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onModerate(message, message.pinned ? "unpin" : "pin")}
            >
              {message.pinned ? <PinOff className="mr-2 size-4" /> : <Pin className="mr-2 size-4" />}
              {message.pinned ? "Unpin" : "Pin"}
            </Button>
            <Button
              size="sm"
              variant={isRemoved ? "outline" : "ghost"}
              onClick={() => onModerate(message, isRemoved ? "restore" : "remove")}
            >
              {isRemoved ? <Undo2 className="mr-2 size-4" /> : <Trash2 className="mr-2 size-4" />}
              {isRemoved ? "Restore" : "Remove"}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
