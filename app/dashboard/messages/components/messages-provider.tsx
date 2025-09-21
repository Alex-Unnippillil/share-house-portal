"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type {
  BuildingRow,
  ProfileSummary,
  TenantAssignmentRow,
  UnitRow,
} from "@/types/messages"
import type { ModerationAction } from "../actions"
import {
  moderateMessageAction,
  postMessageAction,
  toggleReactionAction,
  createThreadAction,
} from "../actions"
import useSupabaseBrowser from "@/utils/supabase-browser"
import {
  buildInitialState,
  createOptimisticMessage,
  ensureMessageMetadata,
  messagesReducer,
  type MessageEntity,
  type MessagesState,
} from "@/lib/messages/state"
import type { MessageMetadataShape, ThreadWithRelations } from "@/types/messages"
import { emitNotification } from "@/lib/notifications"
import { canModerateThread } from "@/lib/messages/permissions"
import type { NotificationBridgePayload } from "@/types/messages"

interface PendingOperation {
  id: string
  execute: () => Promise<void>
  description: string
}

interface SendMessageInput {
  threadId: string
  body: string
  parentMessageId?: string | null
  metadata?: MessageMetadataShape
  messageType?: string
}

interface CreateThreadInput {
  title: string
  buildingId: string
  unitId?: string | null
  category?: string
  metadata?: MessageMetadataShape
}

interface ReactionInput {
  messageId: string
  reactionType: string
  metadata?: Record<string, unknown>
}

export interface ModerationInput {
  messageId: string
  action: ModerationAction
  reason?: string
}

interface MessagesContextValue {
  state: MessagesState
  selectedThreadId: string | null
  selectThread: (threadId: string | null) => void
  sendMessage: (input: SendMessageInput) => Promise<void>
  createThread: (input: CreateThreadInput) => Promise<void>
  toggleReaction: (input: ReactionInput) => Promise<void>
  moderateMessage: (input: ModerationInput) => Promise<void>
  profile: ProfileSummary
  assignments: TenantAssignmentRow[]
  buildings: BuildingRow[]
  units: UnitRow[]
  isOnline: boolean
  pendingCount: number
  profileCache: Record<string, ProfileSummary>
}

const THREAD_SELECT = `
  id,
  building_id,
  unit_id,
  created_at,
  updated_at,
  created_by,
  title,
  category,
  metadata,
  pinned_message_id,
  is_locked,
  created_by_profile:profiles!threads_created_by_fkey (
    id,
    full_name,
    avatar_url,
    role
  ),
  messages (
    id,
    thread_id,
    parent_message_id,
    created_by,
    body,
    message_type,
    metadata,
    is_deleted,
    deleted_at,
    created_at,
    updated_at,
    created_by_profile:profiles!messages_created_by_fkey (
      id,
      full_name,
      avatar_url,
      role
    ),
    message_reactions (
      id,
      message_id,
      profile_id,
      reaction_type,
      metadata,
      created_at,
      reactor_profile:profiles!message_reactions_profile_id_fkey (
        id,
        full_name,
        avatar_url,
        role
      )
    ),
    message_moderation (
      id,
      message_id,
      moderator_id,
      action,
      reason,
      created_at,
      moderator_profile:profiles!message_moderation_moderator_id_fkey (
        id,
        full_name,
        avatar_url,
        role
      )
    )
  )
`

const MESSAGE_SELECT = `
  id,
  thread_id,
  parent_message_id,
  created_by,
  body,
  message_type,
  metadata,
  is_deleted,
  deleted_at,
  created_at,
  updated_at,
  created_by_profile:profiles!messages_created_by_fkey (
    id,
    full_name,
    avatar_url,
    role
  ),
  message_reactions (
    id,
    message_id,
    profile_id,
    reaction_type,
    metadata,
    created_at,
    reactor_profile:profiles!message_reactions_profile_id_fkey (
      id,
      full_name,
      avatar_url,
      role
    )
  ),
  message_moderation (
    id,
    message_id,
    moderator_id,
    action,
    reason,
    created_at,
    moderator_profile:profiles!message_moderation_moderator_id_fkey (
      id,
      full_name,
      avatar_url,
      role
    )
  )
`

const MessagesContext = createContext<MessagesContextValue | null>(null)

function generateOptimisticId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 12)}`
}

function findMessageEntry(state: MessagesState, messageId: string): {
  threadId: string
  message: MessageEntity
} | null {
  for (const [threadId, entity] of Object.entries(state.threads)) {
    const message = entity.messages[messageId]
    if (message) {
      return { threadId, message }
    }
  }

  return null
}

function summarizeNotification(
  payload: NotificationBridgePayload,
  state: MessagesState,
  buildings: BuildingRow[],
  units: UnitRow[],
) {
  const thread = state.threads[payload.threadId]?.thread
  const building = buildings.find((entry) => entry.id === payload.buildingId)
  const unit = payload.unitId
    ? units.find((entry) => entry.id === payload.unitId)
    : undefined

  const titleParts = [thread?.title ?? "Thread"]
  if (building?.name) {
    titleParts.push(building.name)
  }
  if (unit?.label) {
    titleParts.push(unit.label)
  }

  const title = titleParts.join(" • ")

  let body = "New activity"
  if (payload.action === "new_message") {
    body = "New message received"
  } else if (payload.action === "moderation") {
    body = "A moderator updated a message"
  } else if (payload.action === "status_update") {
    body = "Thread status changed"
  }

  return { title, body }
}

export interface MessagesProviderProps {
  profile: ProfileSummary
  assignments: TenantAssignmentRow[]
  buildings: BuildingRow[]
  units: UnitRow[]
  initialThreads: ThreadWithRelations[]
  children: ReactNode
}

export function MessagesProvider({
  profile,
  assignments,
  buildings,
  units,
  initialThreads,
  children,
}: MessagesProviderProps) {
  const supabase = useSupabaseBrowser()
  const [state, dispatch] = useReducer(
    messagesReducer,
    initialThreads,
    buildInitialState,
  )
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(() => {
    const firstThread = state.threadOrder[0]
    return firstThread ?? null
  })

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") {
      return true
    }

    return navigator.onLine
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const pendingRef = useRef<PendingOperation[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  const enqueueOperation = useCallback((operation: PendingOperation) => {
    pendingRef.current = [...pendingRef.current, operation]
    setPendingCount(pendingRef.current.length)
  }, [])

  const flushQueue = useCallback(async () => {
    if (!pendingRef.current.length) {
      return
    }

    const queue = [...pendingRef.current]
    for (const operation of queue) {
      try {
        await operation.execute()
        pendingRef.current = pendingRef.current.filter((item) => item.id !== operation.id)
        setPendingCount(pendingRef.current.length)
      } catch (error) {
        console.error("Failed to process pending operation", error)
        break
      }
    }
  }, [])

  useEffect(() => {
    if (isOnline) {
      void flushQueue()
    }
  }, [isOnline, flushQueue])

  const profileCacheRef = useRef<Record<string, ProfileSummary>>({ [profile.id]: profile })

  useEffect(() => {
    const cache: Record<string, ProfileSummary> = { [profile.id]: profile }

    for (const entity of Object.values(state.threads)) {
      const creator = entity.thread.created_by_profile
      if (creator) {
        cache[creator.id] = creator
      }

      for (const messageId of entity.messageOrder) {
        const message = entity.messages[messageId]
        if (message.created_by_profile) {
          cache[message.created_by_profile.id] = message.created_by_profile
        }
        for (const reaction of message.reactions) {
          if (reaction.reactor_profile) {
            cache[reaction.reactor_profile.id] = reaction.reactor_profile
          }
        }
        for (const moderation of message.moderation) {
          if (moderation.moderator_profile) {
            cache[moderation.moderator_profile.id] = moderation.moderator_profile
          }
        }
      }
    }

    profileCacheRef.current = cache
  }, [state, profile])

  const buildingIds = useMemo(
    () => Array.from(new Set(assignments.map((assignment) => assignment.building_id))),
    [assignments],
  )

  const bridgeNotification = useCallback(
    (payload: NotificationBridgePayload) => {
      const { title, body } = summarizeNotification(
        payload,
        stateRef.current,
        buildings,
        units,
      )

      emitNotification({
        domain: "messages",
        title,
        body,
        metadata: {
          threadId: payload.threadId,
          messageId: payload.messageId,
        },
      })

      if (payload.maintenanceTicketId) {
        emitNotification({
          domain: "maintenance",
          title: `Ticket ${payload.maintenanceTicketId}`,
          body: "A new update is available",
          metadata: {
            threadId: payload.threadId,
            messageId: payload.messageId,
            maintenanceTicketId: payload.maintenanceTicketId,
          },
        })
      }
    },
    [buildings, units],
  )

  const hydrateThread = useCallback(
    async (threadId: string) => {
      const { data } = await supabase
        .from("threads")
        .select(THREAD_SELECT)
        .eq("id", threadId)
        .maybeSingle()

      if (data) {
        dispatch({ type: "UPSERT_THREAD", thread: data })

        const metadata = ensureMessageMetadata(data.metadata)
        if (metadata.clientRef) {
          const optimisticEntry = Object.entries(stateRef.current.threads).find(
            ([id, entry]) =>
              id !== data.id && ensureMessageMetadata(entry.thread.metadata).clientRef === metadata.clientRef,
          )

          if (optimisticEntry) {
            dispatch({ type: "REMOVE_THREAD", threadId: optimisticEntry[0] })
          }
        }
      }
    },
    [supabase],
  )

  const hydrateMessage = useCallback(
    async (messageId: string, eventType: "INSERT" | "UPDATE") => {
      const { data } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("id", messageId)
        .maybeSingle()

      if (data) {
        const creator = data.created_by_profile
        if (creator) {
          profileCacheRef.current[creator.id] = creator
        }

        dispatch({ type: "UPSERT_MESSAGE", message: data })

        const metadata = ensureMessageMetadata(data.metadata)
        if (metadata.clientRef) {
          const match = findMessageEntry(stateRef.current, messageId)
          if (match) {
            const message = match.message
            if (ensureMessageMetadata(message.metadata).clientRef === metadata.clientRef) {
              // Replace optimistic entry by removing the placeholder id if necessary
              if (message.id !== data.id && message.id.startsWith("optimistic")) {
                dispatch({
                  type: "DELETE_MESSAGE",
                  messageId: message.id,
                  threadId: match.threadId,
                })
              }
            }
          }
        }

        if (eventType === "INSERT") {
          bridgeNotification({
            messageId: data.id,
            threadId: data.thread_id,
            buildingId: stateRef.current.threads[data.thread_id]?.thread.building_id ?? "",
            unitId: stateRef.current.threads[data.thread_id]?.thread.unit_id ?? null,
            action: "new_message",
            maintenanceTicketId: ensureMessageMetadata(data.metadata).maintenanceTicketId,
          })
        }
      }
    },
    [supabase, bridgeNotification],
  )

  const handleThreadChange = useCallback(
    async (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE"
      new: { id: string }
      old: { id: string }
    }) => {
      if (payload.eventType === "DELETE") {
        dispatch({ type: "REMOVE_THREAD", threadId: payload.old.id })
        return
      }

      const threadId = payload.new.id
      await hydrateThread(threadId)
    },
    [hydrateThread],
  )

  const handleMessageChange = useCallback(
    async (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE"
      new: { id: string; thread_id: string; is_deleted?: boolean; deleted_at?: string | null }
      old: { id: string; thread_id: string; is_deleted?: boolean; deleted_at?: string | null }
    }) => {
      if (payload.eventType === "DELETE") {
        dispatch({
          type: "DELETE_MESSAGE",
          threadId: payload.old.thread_id,
          messageId: payload.old.id,
        })
        return
      }

      if (payload.eventType === "UPDATE" && payload.new.is_deleted) {
        dispatch({
          type: "MARK_MESSAGE_DELETED",
          threadId: payload.new.thread_id,
          messageId: payload.new.id,
          deletedAt: payload.new.deleted_at ?? undefined,
        })
      }

      await hydrateMessage(payload.new.id, payload.eventType)
    },
    [hydrateMessage],
  )

  const handleReactionChange = useCallback(
    async (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE"
      new: { id: string; message_id: string }
      old: { id: string; message_id: string }
    }) => {
      if (payload.eventType === "DELETE") {
        const entry = findMessageEntry(stateRef.current, payload.old.message_id)
        if (entry) {
          dispatch({
            type: "DELETE_REACTION",
            reactionId: payload.old.id,
            threadId: entry.threadId,
            messageId: payload.old.message_id,
          })
        }
        return
      }

      const { data } = await supabase
        .from("message_reactions")
        .select(
          `
            id,
            message_id,
            profile_id,
            reaction_type,
            metadata,
            created_at,
            reactor_profile:profiles!message_reactions_profile_id_fkey (
              id,
              full_name,
              avatar_url,
              role
            )
          `,
        )
        .eq("id", payload.new.id)
        .maybeSingle()

      if (data) {
        if (data.reactor_profile) {
          profileCacheRef.current[data.reactor_profile.id] = data.reactor_profile
        }
        dispatch({ type: "UPSERT_REACTION", reaction: data })
      }
    },
    [supabase],
  )

  const handleModerationChange = useCallback(
    async (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE"
      new: { id: string; message_id: string; action: ModerationAction }
      old: { id: string; message_id: string }
    }) => {
      if (payload.eventType === "DELETE") {
        return
      }

      const { data } = await supabase
        .from("message_moderation")
        .select(
          `
            id,
            message_id,
            moderator_id,
            action,
            reason,
            created_at,
            moderator_profile:profiles!message_moderation_moderator_id_fkey (
              id,
              full_name,
              avatar_url,
              role
            )
          `,
        )
        .eq("id", payload.new.id)
        .maybeSingle()

      if (data) {
        if (data.moderator_profile) {
          profileCacheRef.current[data.moderator_profile.id] = data.moderator_profile
        }
        dispatch({ type: "UPSERT_MODERATION", moderation: data })

        const messageEntry = findMessageEntry(stateRef.current, data.message_id)
        if (messageEntry) {
          bridgeNotification({
            messageId: data.message_id,
            threadId: messageEntry.threadId,
            buildingId: stateRef.current.threads[messageEntry.threadId]?.thread.building_id ?? "",
            unitId: stateRef.current.threads[messageEntry.threadId]?.thread.unit_id ?? null,
            action: "moderation",
          })
        }
      }
    },
    [supabase, bridgeNotification],
  )

  useEffect(() => {
    if (!buildingIds.length) {
      return
    }

    const channels = buildingIds.map((buildingId) =>
      supabase
        .channel(`messages:${buildingId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "threads", filter: `building_id=eq.${buildingId}` }, handleThreadChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, handleMessageChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, handleReactionChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "message_moderation" }, handleModerationChange)
        .subscribe(),
    )

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel)
      })
    }
  }, [supabase, buildingIds, handleThreadChange, handleMessageChange, handleReactionChange, handleModerationChange])

  const selectThread = useCallback((threadId: string | null) => {
    setSelectedThreadId(threadId)
  }, [])

  const createThread = useCallback(
    async (input: CreateThreadInput) => {
      const clientRef = generateOptimisticId("thread")
      const optimisticThread: ThreadWithRelations = {
        id: `optimistic-thread-${clientRef}`,
        building_id: input.buildingId,
        unit_id: input.unitId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: profile.id,
        title: input.title,
        category: input.category ?? "general",
        metadata: { ...(input.metadata ?? {}), clientRef },
        pinned_message_id: null,
        is_locked: false,
        created_by_profile: profile,
        messages: [],
      }

      dispatch({ type: "UPSERT_THREAD", thread: optimisticThread })
      setSelectedThreadId(optimisticThread.id)

      const mutation = async () => {
        await createThreadAction({
          ...input,
          metadata: { ...(input.metadata ?? {}), clientRef },
          clientRef,
        })
      }

      if (!isOnline) {
        enqueueOperation({
          id: optimisticThread.id,
          execute: mutation,
          description: "create-thread",
        })
        return
      }

      try {
        await mutation()
      } catch (error) {
        console.error("Failed to create thread", error)
      }
    },
    [profile, isOnline, enqueueOperation],
  )

  const sendMessage = useCallback(
    async (input: SendMessageInput) => {
      const clientRef = generateOptimisticId("message")
      const optimisticMessage = createOptimisticMessage({
        thread_id: input.threadId,
        parent_message_id: input.parentMessageId ?? null,
        body: input.body,
        message_type: input.messageType ?? "text",
        metadata: { ...(input.metadata ?? {}), clientRef },
        created_by: profile.id,
        created_by_profile: profile,
      })

      dispatch({ type: "UPSERT_MESSAGE", message: optimisticMessage, optimistic: true })

      const mutation = async () => {
        await postMessageAction({
          threadId: input.threadId,
          body: input.body,
          parentMessageId: input.parentMessageId ?? null,
          messageType: input.messageType ?? "text",
          metadata: { ...(input.metadata ?? {}), clientRef },
          clientRef,
        })
      }

      if (!isOnline) {
        enqueueOperation({
          id: optimisticMessage.id,
          execute: mutation,
          description: "send-message",
        })
        return
      }

      try {
        await mutation()
      } catch (error) {
        console.error("Failed to send message", error)
      }
    },
    [profile, isOnline, enqueueOperation],
  )

  const toggleReaction = useCallback(
    async (input: ReactionInput) => {
      const entry = findMessageEntry(stateRef.current, input.messageId)
      if (!entry) {
        return
      }

      const existing = entry.message.reactions.find(
        (reaction) =>
          reaction.profile_id === profile.id && reaction.reaction_type === input.reactionType,
      )

      if (existing) {
        dispatch({
          type: "DELETE_REACTION",
          reactionId: existing.id,
          threadId: entry.threadId,
          messageId: input.messageId,
        })
      } else {
        const optimisticId = generateOptimisticId("reaction")
        dispatch({
          type: "UPSERT_REACTION",
          reaction: {
            id: optimisticId,
            message_id: input.messageId,
            profile_id: profile.id,
            reaction_type: input.reactionType,
            metadata: input.metadata ?? {},
            created_at: new Date().toISOString(),
            reactor_profile: profile,
          },
        })
      }

      const mutation = async () => {
        await toggleReactionAction(input)
      }

      if (!isOnline) {
        enqueueOperation({
          id: `reaction-${input.messageId}-${input.reactionType}`,
          execute: mutation,
          description: "toggle-reaction",
        })
        return
      }

      try {
        await mutation()
      } catch (error) {
        console.error("Failed to update reaction", error)
      }
    },
    [profile, isOnline, enqueueOperation],
  )

  const moderateMessage = useCallback(
    async (input: ModerationInput) => {
      const entry = findMessageEntry(stateRef.current, input.messageId)
      if (!entry) {
        throw new Error("Message not found")
      }

      const thread = stateRef.current.threads[entry.threadId].thread
      const canModerate = canModerateThread(thread, assignments)
      if (!canModerate) {
        throw new Error("Insufficient permissions")
      }

      if (input.action === "pin" || input.action === "unpin") {
        dispatch({ type: "SET_PINNED", threadId: entry.threadId, messageId: input.action === "pin" ? input.messageId : null })
      }

      if (input.action === "delete") {
        dispatch({
          type: "MARK_MESSAGE_DELETED",
          threadId: entry.threadId,
          messageId: input.messageId,
          deletedAt: new Date().toISOString(),
        })
      }

      const mutation = async () => {
        await moderateMessageAction(input)
      }

      if (!isOnline) {
        enqueueOperation({
          id: `moderation-${input.messageId}-${input.action}`,
          execute: mutation,
          description: "moderate-message",
        })
        return
      }

      try {
        await mutation()
      } catch (error) {
        console.error("Failed to moderate message", error)
      }
    },
    [assignments, isOnline, enqueueOperation],
  )

  const contextValue = useMemo<MessagesContextValue>(
    () => ({
      state,
      selectedThreadId,
      selectThread,
      sendMessage,
      createThread,
      toggleReaction,
      moderateMessage,
      profile,
      assignments,
      buildings,
      units,
      isOnline,
      pendingCount,
      profileCache: profileCacheRef.current,
    }),
    [
      state,
      selectedThreadId,
      selectThread,
      sendMessage,
      createThread,
      toggleReaction,
      moderateMessage,
      profile,
      assignments,
      buildings,
      units,
      isOnline,
      pendingCount,
    ],
  )

  return <MessagesContext.Provider value={contextValue}>{children}</MessagesContext.Provider>
}

export function useMessagesContext() {
  const context = useContext(MessagesContext)
  if (!context) {
    throw new Error("MessagesContext must be used within a MessagesProvider")
  }

  return context
}
