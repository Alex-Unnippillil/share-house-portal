"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  ArrowRight,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Send,
  ShieldAlert,
  Undo2,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { mergeMessageChange, mergeReactionChange } from "@/lib/messages/realtime"
import { isStaffRole, canModerate } from "@/lib/messages/permissions"
import {
  MESSAGE_WITH_RELATIONS_SELECT,
  THREAD_WITH_MESSAGES_SELECT,
} from "@/lib/messages/queries"
import { mapMessage, mapThread } from "@/lib/messages/mappers"
import { pushNotification } from "@/lib/notifications/store"
import type {
  MessageWithRelations,
  PollMetadata,
  ProfileSummary,
  ThreadWithRelations,
  MessageReactionRow,
} from "@/types/messages"
import useSupabaseBrowser from "@/utils/supabase-browser"

import {
  createThreadAction,
  moderateMessageAction,
  sendMessageAction,
  toggleReactionAction,
  voteOnPollAction,
} from "./actions"

const REACTIONS = ["👍", "🎉", "❤️", "👀"]
const QUEUE_KEY = "share-house-message-queue"

type MessageBoardProps = {
  initialThreads: ThreadWithRelations[]
  profile: ProfileSummary
  initialThreadId?: string
}

type SendMessageInput = {
  threadId: string
  content: string
  messageType?: "text" | "poll"
  metadata?: PollMetadata
  parentMessageId?: string | null
  clientId?: string
}

type PendingAction = {
  id: string
  type: "send-message"
  payload: SendMessageInput
}

type PollOptionDraft = {
  id: string
  label: string
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const sortMessages = (messages: MessageWithRelations[]) =>
  [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

const MessageBoard = ({
  initialThreads,
  profile,
  initialThreadId,
}: MessageBoardProps) => {
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()

  const [threads, setThreads] = useState<ThreadWithRelations[]>(() =>
    [...initialThreads]
      .map((thread) => ({ ...thread, messages: [] }))
      .sort(
        (a, b) =>
          new Date(b.last_message_at ?? b.created_at).getTime() -
          new Date(a.last_message_at ?? a.created_at).getTime()
      )
  )
  const [messagesByThread, setMessagesByThread] = useState<
    Record<string, MessageWithRelations[]>
  >(() => {
    const next: Record<string, MessageWithRelations[]> = {}
    initialThreads.forEach((thread) => {
      next[thread.id] = sortMessages(thread.messages ?? [])
    })
    return next
  })
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(() => {
    if (initialThreadId && initialThreads.some((thread) => thread.id === initialThreadId)) {
      return initialThreadId
    }
    return initialThreads[0]?.id
  })
  const [replyTo, setReplyTo] = useState<MessageWithRelations | null>(null)
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  )
  const [pendingQueue, setPendingQueue] = useState<PendingAction[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const [isSubmittingThread, setIsSubmittingThread] = useState(false)
  const [composerState, setComposerState] = useState({
    content: "",
    type: "text" as "text" | "poll",
    pollOptions: [
      { id: generateId(), label: "" },
      { id: generateId(), label: "" },
    ],
  })
  const [isComposerBusy, setIsComposerBusy] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const [newThreadMessage, setNewThreadMessage] = useState("")
  const [newThreadType, setNewThreadType] = useState<"text" | "poll">("text")
  const [newThreadPollOptions, setNewThreadPollOptions] = useState<PollOptionDraft[]>([
    { id: generateId(), label: "" },
    { id: generateId(), label: "" },
  ])
  const [newThreadScope, setNewThreadScope] = useState<"unit" | "building">(
    isStaffRole(profile.role) ? "building" : "unit"
  )
  const [newThreadUnitId, setNewThreadUnitId] = useState(profile.unit_id ?? "")
  const activeThreadIdRef = useRef<string | undefined>(activeThreadId)

  const persistQueue = useCallback((queue: PendingAction[]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    try {
      const raw = window.localStorage.getItem(QUEUE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PendingAction[]
        if (Array.isArray(parsed)) {
          setPendingQueue(parsed)
        }
      }
    } catch (error) {
      console.error("Failed to restore message queue", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleStatus = () => setIsOffline(!navigator.onLine)
    handleStatus()
    window.addEventListener("online", handleStatus)
    window.addEventListener("offline", handleStatus)
    return () => {
      window.removeEventListener("online", handleStatus)
      window.removeEventListener("offline", handleStatus)
    }
  }, [])
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  }, [activeThreadId])
  const processQueue = useCallback(async () => {
    if (
      isProcessingQueue ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      return
    }
    if (pendingQueue.length === 0) {
      return
    }
    setIsProcessingQueue(true)
    let remaining = [...pendingQueue]
    for (const action of pendingQueue) {
      try {
        if (action.type === "send-message") {
          const result = await sendMessageAction(action.payload)
          setMessagesByThread((prev) => {
            const current = prev[action.payload.threadId] ?? []
            const updated = mergeMessageChange(
              current,
              {
                eventType: "INSERT",
                new: result.message as any,
                old: null,
                schema: "public",
                table: "messages",
              },
              (row) => mapMessage({ ...row })
            )
            return {
              ...prev,
              [action.payload.threadId]: sortMessages(updated),
            }
          })
          setThreads((prev) =>
            prev.map((thread) =>
              thread.id === action.payload.threadId
                ? { ...thread, ...result.thread }
                : thread
            )
          )
        }
        remaining = remaining.filter((item) => item.id !== action.id)
        setPendingQueue(remaining)
        persistQueue(remaining)
      } catch (error) {
        console.error("Failed to process queued message", error)
        break
      }
    }
    setIsProcessingQueue(false)
  }, [isProcessingQueue, pendingQueue, persistQueue])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    processQueue()
    const handleOnline = () => {
      processQueue().catch((error) => console.error(error))
    }
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [processQueue])

  useEffect(() => {
    if (!profile.building_id) {
      return
    }
    const filter = `building_id=eq.${profile.building_id}`
    const allowMessage = (message: Partial<MessageWithRelations>) => {
      if (isStaffRole(profile.role)) {
        return true
      }
      return !message.unit_id || message.unit_id === profile.unit_id
    }

    const channel = supabase
      .channel(`messages:${profile.building_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter },
        async (payload) => {
          const row = (payload.new ?? payload.old) as MessageWithRelations | null
          if (!row || !row.thread_id || !allowMessage(row)) {
            return
          }
          setMessagesByThread((prev) => {
            const current = prev[row.thread_id] ?? []
            const updated = mergeMessageChange(
              current,
              payload as any,
              (incoming) => mapMessage({ ...incoming })
            )
            return { ...prev, [row.thread_id]: sortMessages(updated) }
          })
          if (payload.eventType === "INSERT") {
            try {
              const { data, error } = await supabase
                .from("messages")
                .select(MESSAGE_WITH_RELATIONS_SELECT)
                .eq("id", row.id)
                .single()
              if (!error && data) {
                setMessagesByThread((prev) => {
                  const current = prev[row.thread_id] ?? []
                  const updated = mergeMessageChange(
                    current,
                    {
                      eventType: "UPDATE",
                      new: data as any,
                      old: null,
                      schema: "public",
                      table: "messages",
                    },
                    (incoming) => mapMessage({ ...incoming })
                  )
                  return { ...prev, [row.thread_id]: sortMessages(updated) }
                })
              }
            } catch (error) {
              console.error("Failed to hydrate realtime message", error)
            }
          }
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setThreads((prev) => {
              const next = prev.map((thread) =>
                thread.id === row.thread_id
                  ? {
                      ...thread,
                      last_message_at:
                        payload.eventType === "INSERT"
                          ? row.created_at
                          : thread.last_message_at,
                    }
                  : thread
              )
              return next.sort(
                (a, b) =>
                  new Date(b.last_message_at ?? b.created_at).getTime() -
                  new Date(a.last_message_at ?? a.created_at).getTime()
              )
            })
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter },
        (payload) => {
          const reaction = (payload.new ?? payload.old) as MessageReactionRow | null
          if (!reaction || !allowMessage({ unit_id: reaction.unit_id })) {
            return
          }
          setMessagesByThread((prev) => {
            let targetThreadId: string | null = null
            let current: MessageWithRelations[] | undefined
            for (const [threadId, list] of Object.entries(prev)) {
              if (list.some((message) => message.id === reaction.message_id)) {
                targetThreadId = threadId
                current = list
                break
              }
            }
            if (!targetThreadId || !current) {
              return prev
            }
            const updated = mergeReactionChange(current, payload as any)
            return {
              ...prev,
              [targetThreadId]: updated,
            }
          })
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_moderation", filter },
        (payload) => {
          const moderation = payload.new as {
            message_id: string
            thread_id: string
            action: string
            created_at: string
          }
          if (moderation.action === "pin") {
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === moderation.thread_id
                  ? {
                      ...thread,
                      pinned_message_id: moderation.message_id,
                      pinned_at: moderation.created_at,
                    }
                  : thread
              )
            )
          }
          if (moderation.action === "unpin") {
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === moderation.thread_id
                  ? { ...thread, pinned_message_id: null, pinned_at: null }
                  : thread
              )
            )
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "threads", filter },
        async (payload) => {
          const threadRow = (payload.new ?? payload.old) as
            | ({ id: string; building_id: string; unit_id: string | null } & Partial<ThreadWithRelations>)
            | null
          if (!threadRow) {
            return
          }
          if (!allowMessage({ unit_id: threadRow.unit_id ?? undefined })) {
            return
          }

          if (payload.eventType === "DELETE") {
            setThreads((prev) => {
              const filtered = prev.filter((thread) => thread.id !== threadRow.id)
              if (activeThreadIdRef.current === threadRow.id) {
                setActiveThreadId(filtered[0]?.id)
              }
              return filtered
            })
            setMessagesByThread((prev) => {
              if (!prev[threadRow.id]) {
                return prev
              }
              const next = { ...prev }
              delete next[threadRow.id]
              return next
            })
            return
          }

          if (payload.eventType === "INSERT") {
            try {
              const { data, error } = await supabase
                .from("threads")
                .select(THREAD_WITH_MESSAGES_SELECT)
                .eq("id", threadRow.id)
                .single()
              if (!error && data) {
                const mapped = mapThread(data)
                if (!allowMessage({ unit_id: mapped.unit_id ?? undefined })) {
                  return
                }
                setThreads((prev) => {
                  const next = [{ ...mapped, messages: [] }, ...prev.filter((thread) => thread.id !== mapped.id)]
                  return next.sort(
                    (a, b) =>
                      new Date(b.last_message_at ?? b.created_at).getTime() -
                      new Date(a.last_message_at ?? a.created_at).getTime()
                  )
                })
                setMessagesByThread((prev) => ({
                  ...prev,
                  [mapped.id]: sortMessages(mapped.messages ?? []),
                }))
              }
            } catch (error) {
              console.error("Failed to hydrate thread", error)
            }
            return
          }

          if (payload.eventType === "UPDATE") {
            setThreads((prev) => {
              const next = prev.map((thread) =>
                thread.id === threadRow.id
                  ? {
                      ...thread,
                      ...threadRow,
                    }
                  : thread
              )
              return next.sort(
                (a, b) =>
                  new Date(b.last_message_at ?? b.created_at).getTime() -
                  new Date(a.last_message_at ?? a.created_at).getTime()
              )
            })
          }
        }
      )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.building_id, profile.role, profile.unit_id, supabase])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId),
    [threads, activeThreadId]
  )

  const activeMessages = useMemo(
    () => (activeThreadId ? messagesByThread[activeThreadId] ?? [] : []),
    [activeThreadId, messagesByThread]
  )
  const handleSendMessage = useCallback(
    async (
      threadId: string,
      content: string,
      messageType: "text" | "poll" = "text",
      metadata?: PollMetadata,
      parentMessageId?: string | null
    ) => {
      const trimmed = content.trim()
      if (!trimmed) {
        return
      }
      const clientId = generateId()
      const optimistic: MessageWithRelations = {
        id: clientId,
        thread_id: threadId,
        parent_message_id: parentMessageId ?? null,
        author_id: profile.id,
        content: trimmed,
        message_type: messageType,
        metadata: metadata ?? {},
        status: "active",
        client_id: clientId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        building_id: profile.building_id!,
        unit_id: profile.unit_id ?? null,
        author: profile,
        reactions: [],
        moderation: [],
      }
      setMessagesByThread((prev) => {
        const current = prev[threadId] ?? []
        return { ...prev, [threadId]: sortMessages([...current, optimistic]) }
      })
      setThreads((prev) =>
        prev
          .map((thread) =>
            thread.id === threadId
              ? { ...thread, last_message_at: optimistic.created_at }
              : thread
          )
          .sort(
            (a, b) =>
              new Date(b.last_message_at ?? b.created_at).getTime() -
              new Date(a.last_message_at ?? a.created_at).getTime()
          )
      )

      const payload: SendMessageInput = {
        threadId,
        content: trimmed,
        messageType,
        metadata,
        parentMessageId: parentMessageId ?? undefined,
        clientId,
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const queued: PendingAction = { id: clientId, type: "send-message", payload }
        setPendingQueue((prev) => {
          const next = [...prev, queued]
          persistQueue(next)
          return next
        })
        toast({
          title: "Message queued",
          description: "We'll send this once you're back online.",
        })
        return
      }

      setIsComposerBusy(true)
      try {
        const result = await sendMessageAction(payload)
        setMessagesByThread((prev) => {
          const current = prev[threadId] ?? []
          const updated = mergeMessageChange(
            current,
            {
              eventType: "UPDATE",
              new: result.message as any,
              old: null,
              schema: "public",
              table: "messages",
            },
            (row) => mapMessage({ ...row })
          )
          return { ...prev, [threadId]: sortMessages(updated) }
        })
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId ? { ...thread, ...result.thread } : thread
          )
        )
        pushNotification({
          id: result.message.id,
          type: "message:new",
          title: messageType === "poll" ? "Poll sent" : "Message sent",
          description: trimmed.slice(0, 120),
          createdAt: result.message.created_at,
          link: `/dashboard/messages?thread=${threadId}`,
          status: result.message.status,
          threadId,
          messageId: result.message.id,
        })
      } catch (error) {
        console.error(error)
        setMessagesByThread((prev) => {
          const current = prev[threadId] ?? []
          return {
            ...prev,
            [threadId]: current.map((message) =>
              message.id === clientId
                ? {
                    ...message,
                    status: "flagged",
                    metadata: {
                      ...(message.metadata ?? {}),
                      error: (error as Error).message,
                    },
                  }
                : message
            ),
          }
        })
        toast({
          title: "Unable to send message",
          description: (error as Error).message,
          variant: "destructive",
        })
      } finally {
        setIsComposerBusy(false)
      }
    },
    [persistQueue, profile, toast]
  )

  const handleReaction = useCallback(
    async (threadId: string, message: MessageWithRelations, emoji: string) => {
      const hasReaction = message.reactions.some(
        (reaction) =>
          reaction.profile_id === profile.id && reaction.reaction === emoji
      )
      setMessagesByThread((prev) => {
        const current = prev[threadId] ?? []
        const updated = current.map((item) => {
          if (item.id !== message.id) {
            return item
          }
          if (hasReaction) {
            return {
              ...item,
              reactions: item.reactions.filter(
                (reaction) =>
                  !(
                    reaction.profile_id === profile.id &&
                    reaction.reaction === emoji
                  )
              ),
            }
          }
          return {
            ...item,
            reactions: [
              ...item.reactions,
              {
                id: generateId(),
                message_id: message.id,
                profile_id: profile.id,
                reaction: emoji,
                created_at: new Date().toISOString(),
                building_id: profile.building_id!,
                unit_id: profile.unit_id ?? null,
                profile,
              },
            ],
          }
        })
        return { ...prev, [threadId]: updated }
      })
      try {
        const result = await toggleReactionAction({
          messageId: message.id,
          reaction: emoji,
        })
        setMessagesByThread((prev) => ({
          ...prev,
          [threadId]: prev[threadId]?.map((item) =>
            item.id === result.id ? result : item
          ),
        }))
      } catch (error) {
        setMessagesByThread((prev) => ({
          ...prev,
          [threadId]: prev[threadId]?.map((item) =>
            item.id === message.id ? { ...item, reactions: message.reactions } : item
          ),
        }))
        toast({
          title: "Unable to update reaction",
          description: (error as Error).message,
          variant: "destructive",
        })
      }
    },
    [profile, toast]
  )

  const handleVote = useCallback(
    async (threadId: string, message: MessageWithRelations, optionId: string) => {
      try {
        const result = await voteOnPollAction({
          messageId: message.id,
          optionId,
        })
        setMessagesByThread((prev) => ({
          ...prev,
          [threadId]: prev[threadId]?.map((item) =>
            item.id === result.id ? result : item
          ),
        }))
      } catch (error) {
        toast({
          title: "Unable to record vote",
          description: (error as Error).message,
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  const handleModeration = useCallback(
    async (
      threadId: string,
      message: MessageWithRelations,
      action: "pin" | "unpin" | "flag" | "unflag" | "delete" | "restore",
      reason?: string
    ) => {
      try {
        const result = await moderateMessageAction({
          messageId: message.id,
          action,
          reason,
        })
        setMessagesByThread((prev) => ({
          ...prev,
          [threadId]: prev[threadId]?.map((item) =>
            item.id === result.message.id ? result.message : item
          ),
        }))
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId ? { ...thread, ...result.thread } : thread
          )
        )
        toast({
          title: "Moderation applied",
          description: `Message ${action} successfully`,
        })
      } catch (error) {
        toast({
          title: "Unable to update message",
          description: (error as Error).message,
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  const handleCreateThread = useCallback(async () => {
    if (!newThreadTitle.trim()) {
      toast({
        title: "Thread title required",
        description: "Please provide a title before creating a thread.",
      })
      return
    }
    if (newThreadType === "poll") {
      const filled = newThreadPollOptions.filter((option) => option.label.trim())
      if (filled.length < 2) {
        toast({
          title: "Add poll options",
          description: "Polls require at least two options.",
          variant: "destructive",
        })
        return
      }
    }
    setIsSubmittingThread(true)
    try {
      const payload: Record<string, unknown> = {
        title: newThreadTitle.trim(),
      }
      if (isStaffRole(profile.role)) {
        payload.unitId = newThreadScope === "building" ? null : newThreadUnitId || null
      }
      if (newThreadMessage.trim()) {
        payload.initialMessage = {
          content: newThreadMessage.trim(),
          messageType: newThreadType,
          metadata:
            newThreadType === "poll"
              ? {
                  poll_options: newThreadPollOptions
                    .filter((option) => option.label.trim())
                    .map((option) => ({
                      id: option.id,
                      label: option.label.trim(),
                    })),
                }
              : undefined,
        }
      }
      const thread = await createThreadAction(payload)
      setThreads((prev) => {
        const next = [
          { ...thread, messages: [] },
          ...prev.filter((existing) => existing.id !== thread.id),
        ]
        return next.sort(
          (a, b) =>
            new Date(b.last_message_at ?? b.created_at).getTime() -
            new Date(a.last_message_at ?? a.created_at).getTime()
        )
      })
      setMessagesByThread((prev) => ({
        ...prev,
        [thread.id]: sortMessages(thread.messages ?? []),
      }))
      setActiveThreadId(thread.id)
      setIsCreateDialogOpen(false)
      setNewThreadTitle("")
      setNewThreadMessage("")
      setNewThreadType("text")
      setNewThreadPollOptions([
        { id: generateId(), label: "" },
        { id: generateId(), label: "" },
      ])
      toast({
        title: "Thread created",
        description: "Your new thread is ready for conversation.",
      })
    } catch (error) {
      toast({
        title: "Unable to create thread",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsSubmittingThread(false)
    }
  }, [
    newThreadMessage,
    newThreadPollOptions,
    newThreadScope,
    newThreadTitle,
    newThreadType,
    newThreadUnitId,
    profile.role,
    toast,
  ])

  const pinnedMessage = useMemo(() => {
    if (!activeThread?.pinned_message_id) {
      return null
    }
    return activeMessages.find(
      (message) => message.id === activeThread.pinned_message_id
    )
  }, [activeMessages, activeThread])

  const renderMessageContent = (message: MessageWithRelations) => {
    if (message.status === "deleted") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="size-4" /> Message removed by moderation
        </div>
      )
    }
    if (message.message_type === "poll") {
      const metadata = (message.metadata ?? {}) as PollMetadata
      const options = metadata.poll_options ?? []
      const votes = metadata.poll_votes ?? {}
      const totalVotes = options.reduce(
        (total, option) => total + (votes[option.id]?.length ?? 0),
        0
      )
      const currentVote = options.find((option) =>
        (votes[option.id] ?? []).includes(profile.id)
      )
      return (
        <div className="space-y-2">
          <p className="font-medium">{message.content}</p>
          <div className="space-y-2">
            {options.map((option) => {
              const optionVotes = votes[option.id]?.length ?? 0
              const percentage = totalVotes
                ? Math.round((optionVotes / totalVotes) * 100)
                : 0
              const isSelected = currentVote?.id === option.id
              return (
                <Button
                  key={option.id}
                  variant={isSelected ? "default" : "outline"}
                  className="flex w-full items-center justify-between"
                  onClick={() => handleVote(message.thread_id, message, option.id)}
                >
                  <span>{option.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {optionVotes} vote{optionVotes === 1 ? "" : "s"} ({percentage}%)
                  </span>
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"} cast
          </p>
        </div>
      )
    }
    if (message.status === "flagged" && message.metadata?.error) {
      return (
        <div className="space-y-2">
          <p>{message.content}</p>
          <p className="text-xs text-destructive">{String(message.metadata.error)}</p>
        </div>
      )
    }
    return <p>{message.content}</p>
  }
  const repliesMap = useMemo(() => {
    const map = new Map<string, MessageWithRelations[]>()
    activeMessages.forEach((message) => {
      if (message.parent_message_id) {
        const list = map.get(message.parent_message_id) ?? []
        list.push(message)
        map.set(message.parent_message_id, list)
      }
    })
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
    return map
  }, [activeMessages])
  return (
    <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Threads</CardTitle>
            <CardDescription>Conversations across your property</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" /> New thread
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create thread</DialogTitle>
                <DialogDescription>
                  Start a new conversation with your roommates or building staff.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newThreadTitle}
                    onChange={(event) => setNewThreadTitle(event.target.value)}
                    placeholder="Maintenance updates"
                  />
                </div>
                {isStaffRole(profile.role) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scope</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={newThreadScope === "building" ? "default" : "outline"}
                        onClick={() => setNewThreadScope("building")}
                      >
                        Building wide
                      </Button>
                      <Button
                        type="button"
                        variant={newThreadScope === "unit" ? "default" : "outline"}
                        onClick={() => setNewThreadScope("unit")}
                      >
                        Specific unit
                      </Button>
                    </div>
                    {newThreadScope === "unit" && (
                      <Input
                        value={newThreadUnitId}
                        onChange={(event) => setNewThreadUnitId(event.target.value)}
                        placeholder="Unit ID"
                      />
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial message</label>
                  <Textarea
                    value={newThreadMessage}
                    onChange={(event) => setNewThreadMessage(event.target.value)}
                    placeholder="Share context with your roommates"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message type</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newThreadType === "text" ? "default" : "outline"}
                      onClick={() => setNewThreadType("text")}
                    >
                      Standard
                    </Button>
                    <Button
                      type="button"
                      variant={newThreadType === "poll" ? "default" : "outline"}
                      onClick={() => setNewThreadType("poll")}
                    >
                      Poll
                    </Button>
                  </div>
                  {newThreadType === "poll" && (
                    <div className="space-y-2">
                      {newThreadPollOptions.map((option, index) => (
                        <Input
                          key={option.id}
                          value={option.label}
                          onChange={(event) => {
                            const next = [...newThreadPollOptions]
                            next[index] = {
                              ...option,
                              label: event.target.value,
                            }
                            setNewThreadPollOptions(next)
                          }}
                          placeholder={`Option ${index + 1}`}
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNewThreadPollOptions((prev) => [
                            ...prev,
                            { id: generateId(), label: "" },
                          ])
                        }
                      >
                        Add option
                      </Button>
                    </div>
                  )}
                </div>
                <Button onClick={handleCreateThread} disabled={isSubmittingThread}>
                  {isSubmittingThread ? "Creating…" : "Create thread"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOffline && (
            <div className="rounded-md border border-dashed border-yellow-500 bg-yellow-500/10 p-3 text-sm text-yellow-800">
              You&apos;re offline. Messages will be queued until your connection
              returns.
            </div>
          )}
          {pendingQueue.length > 0 && (
            <div className="rounded-md border border-dashed border-blue-500 bg-blue-500/10 p-3 text-sm text-blue-800">
              {pendingQueue.length} message
              {pendingQueue.length === 1 ? "" : "s"} waiting to send
            </div>
          )}
          <ScrollArea className="h-[520px] pr-4">
            <div className="space-y-2">
              {threads.map((thread) => {
                const messages = messagesByThread[thread.id] ?? []
                const latest = messages[messages.length - 1]
                const isActive = thread.id === activeThreadId
                return (
                  <Button
                    key={thread.id}
                    variant={isActive ? "default" : "ghost"}
                    className="h-auto w-full justify-start text-left"
                    onClick={() => {
                      setActiveThreadId(thread.id)
                      setReplyTo(null)
                    }}
                  >
                    <div className="flex w-full flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{thread.title}</span>
                        {thread.pinned_message_id && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Pin className="size-3" /> Pinned
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {thread.unit?.name ?? "All units"}
                      </div>
                      {latest && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">
                            {latest.author?.full_name ?? "Unknown"}: {latest.content}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(latest.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {activeThread ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{activeThread.title}</CardTitle>
                <CardDescription>
                  {activeThread.unit?.name ?? "All building members"}
                </CardDescription>
              </CardHeader>
              {pinnedMessage && (
                <CardContent>
                  <div className="rounded-md border border-dashed border-blue-300 bg-blue-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Pin className="size-4" /> Pinned message
                    </div>
                    <p className="mt-2 text-sm">{pinnedMessage.content}</p>
                  </div>
                </CardContent>
              )}
            </Card>
            <Card>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[480px] pr-4">
                  <div className="space-y-4">
                    {activeMessages.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No messages yet. Start the conversation below.
                      </div>
                    ) : (
                      activeMessages
                        .filter((message) => !message.parent_message_id)
                        .map((message) => {
                          const replies = repliesMap.get(message.id) ?? []
                          const userHasReacted = (emoji: string) =>
                            message.reactions.some(
                              (reaction) =>
                                reaction.profile_id === profile.id &&
                                reaction.reaction === emoji
                            )
                          const reactionGroups = message.reactions.reduce(
                            (acc, reaction) => {
                              const existing = acc.get(reaction.reaction) ?? []
                              existing.push(reaction.profile_id)
                              acc.set(reaction.reaction, existing)
                              return acc
                            },
                            new Map<string, string[]>()
                          )
                          const renderReplies = (parentId: string, depth = 1) => {
                            const nested = repliesMap.get(parentId) ?? []
                            return nested.map((reply) => (
                              <div
                                key={reply.id}
                                className="space-y-2 border-l pl-4"
                                style={{ marginLeft: depth * 12 }}
                              >
                                {renderMessageNode(reply, depth)}
                                {renderReplies(reply.id, depth + 1)}
                              </div>
                            ))
                          }
                          const renderMessageNode = (
                            currentMessage: MessageWithRelations,
                            depth = 0
                          ) => (
                            <div className="space-y-2" key={currentMessage.id}>
                              <div className="flex items-start gap-3">
                                <Avatar className="size-10">
                                  <AvatarImage src={currentMessage.author?.avatar_url ?? undefined} />
                                  <AvatarFallback>
                                    {currentMessage.author?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">
                                      {currentMessage.author?.full_name ?? "Unknown"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(currentMessage.created_at), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                    {currentMessage.status === "flagged" && (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <Flag className="size-3" /> Flagged
                                      </Badge>
                                    )}
                                  </div>
                                  {renderMessageContent(currentMessage)}
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => setReplyTo(currentMessage)}
                                    >
                                      <MessageCircle className="mr-1 size-3" /> Reply
                                    </Button>
                                    {REACTIONS.map((emoji) => (
                                      <Button
                                        key={emoji}
                                        type="button"
                                        size="xs"
                                        variant={userHasReacted(emoji) ? "default" : "ghost"}
                                        onClick={() => handleReaction(currentMessage.thread_id, currentMessage, emoji)}
                                      >
                                        {emoji}
                                        {reactionGroups.get(emoji)?.length ? ` ${reactionGroups.get(emoji)?.length}` : ""}
                                      </Button>
                                    ))}
                                    {canModerate(profile.role) && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button size="xs" variant="ghost">
                                            <MoreHorizontal className="size-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Moderation</DropdownMenuLabel>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleModeration(
                                                currentMessage.thread_id,
                                                currentMessage,
                                                currentMessage.status === "flagged" ? "unflag" : "flag"
                                              )
                                            }
                                          >
                                            {currentMessage.status === "flagged" ? "Remove flag" : "Flag message"}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleModeration(
                                                currentMessage.thread_id,
                                                currentMessage,
                                                currentMessage.status === "deleted" ? "restore" : "delete"
                                              )
                                            }
                                          >
                                            {currentMessage.status === "deleted" ? "Restore" : "Delete"}
                                          </DropdownMenuItem>
                                          {activeThread?.pinned_message_id === currentMessage.id ? (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleModeration(
                                                  currentMessage.thread_id,
                                                  currentMessage,
                                                  "unpin"
                                                )
                                              }
                                            >
                                              Unpin message
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleModeration(
                                                  currentMessage.thread_id,
                                                  currentMessage,
                                                  "pin"
                                                )
                                              }
                                            >
                                              Pin message
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem disabled>
                                            ID: {currentMessage.id.slice(0, 8)}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )

                          return (
                            <div key={message.id} className="space-y-3">
                              {renderMessageNode(message)}
                              {renderReplies(message.id)}
                              <Separator />
                            </div>
                          )
                        })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-4">
                {replyTo && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="size-3" /> Replying to {replyTo.author?.full_name ?? "Unknown"}
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setReplyTo(null)}
                    >
                      <Undo2 className="mr-1 size-3" /> Cancel
                    </Button>
                  </div>
                )}
                <Textarea
                  value={composerState.content}
                  onChange={(event) =>
                    setComposerState((prev) => ({ ...prev, content: event.target.value }))
                  }
                  placeholder="Share an update with your housemates"
                  rows={4}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={composerState.type === "text" ? "default" : "outline"}
                      onClick={() => setComposerState((prev) => ({ ...prev, type: "text" }))}
                    >
                      Message
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={composerState.type === "poll" ? "default" : "outline"}
                      onClick={() =>
                        setComposerState((prev) => ({
                          ...prev,
                          type: "poll",
                          pollOptions: prev.pollOptions.length
                            ? prev.pollOptions
                            : [
                                { id: generateId(), label: "" },
                                { id: generateId(), label: "" },
                              ],
                        }))
                      }
                    >
                      Poll
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      await handleSendMessage(
                        activeThread.id,
                        composerState.content,
                        composerState.type,
                        composerState.type === "poll"
                          ? {
                              poll_options: composerState.pollOptions
                                .filter((option) => option.label.trim())
                                .map((option) => ({
                                  id: option.id,
                                  label: option.label.trim(),
                                })),
                            }
                          : undefined,
                        replyTo?.id ?? null
                      )
                      setComposerState((prev) => ({
                        ...prev,
                        content: "",
                        pollOptions:
                          prev.type === "poll"
                            ? [
                                { id: generateId(), label: "" },
                                { id: generateId(), label: "" },
                              ]
                            : prev.pollOptions,
                      }))
                      setReplyTo(null)
                    }}
                    disabled={isComposerBusy || !composerState.content.trim()}
                  >
                    {isComposerBusy ? "Sending…" : <><Send className="mr-2 size-4" /> Send</>}
                  </Button>
                </div>
                {composerState.type === "poll" && (
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">Poll options</p>
                    {composerState.pollOptions.map((option, index) => (
                      <Input
                        key={option.id}
                        value={option.label}
                        onChange={(event) =>
                          setComposerState((prev) => {
                            const next = [...prev.pollOptions]
                            next[index] = {
                              ...option,
                              label: event.target.value,
                            }
                            return { ...prev, pollOptions: next }
                          })
                        }
                        placeholder={`Option ${index + 1}`}
                      />
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setComposerState((prev) => ({
                          ...prev,
                          pollOptions: [...prev.pollOptions, { id: generateId(), label: "" }],
                        }))
                      }
                    >
                      Add option
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Select a thread from the left or create a new one to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default MessageBoard
