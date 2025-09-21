import type {
  MessageMetadataShape,
  MessageWithRelations,
  ModerationWithProfile,
  ReactionWithProfile,
  ThreadWithRelations,
} from "@/types/messages"

export interface MessageEntity extends MessageWithRelations {
  reactions: ReactionWithProfile[]
  moderation: ModerationWithProfile[]
  optimistic?: boolean
}

export interface ThreadEntity {
  thread: ThreadWithRelations
  messages: Record<string, MessageEntity>
  messageOrder: string[]
}

export interface MessagesState {
  threads: Record<string, ThreadEntity>
  threadOrder: string[]
}

export type MessagesAction =
  | { type: "HYDRATE"; threads: ThreadWithRelations[] }
  | { type: "UPSERT_THREAD"; thread: ThreadWithRelations }
  | { type: "REMOVE_THREAD"; threadId: string }
  | { type: "UPSERT_MESSAGE"; message: MessageWithRelations; optimistic?: boolean }
  | { type: "DELETE_MESSAGE"; messageId: string; threadId: string }
  | { type: "MARK_MESSAGE_DELETED"; messageId: string; threadId: string; deletedAt?: string }
  | { type: "UPSERT_REACTION"; reaction: ReactionWithProfile }
  | { type: "DELETE_REACTION"; reactionId: string; messageId: string; threadId: string }
  | { type: "UPSERT_MODERATION"; moderation: ModerationWithProfile }
  | { type: "SET_PINNED"; threadId: string; messageId: string | null }

function cloneMessage(base: MessageWithRelations, optimistic = false): MessageEntity {
  return {
    ...base,
    reactions: [...(base.message_reactions ?? [])],
    moderation: [...(base.message_moderation ?? [])],
    optimistic,
  }
}

function normalizeThread(thread: ThreadWithRelations): ThreadEntity {
  const messageList = [...(thread.messages ?? [])]
  const sortedMessages = messageList.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const messages: Record<string, MessageEntity> = {}
  const messageOrder: string[] = []

  for (const message of sortedMessages) {
    messages[message.id] = cloneMessage(message)
    messageOrder.push(message.id)
  }

  return {
    thread: { ...thread, messages: undefined },
    messages,
    messageOrder,
  }
}

export function buildInitialState(threads: ThreadWithRelations[]): MessagesState {
  const normalizedThreads = threads.map(normalizeThread)
  const threadOrder = [...normalizedThreads]
    .sort((a, b) => new Date(b.thread.updated_at).getTime() - new Date(a.thread.updated_at).getTime())
    .map((entry) => entry.thread.id)

  const record: Record<string, ThreadEntity> = {}
  for (const entry of normalizedThreads) {
    record[entry.thread.id] = entry
  }

  return {
    threads: record,
    threadOrder,
  }
}

function ensureThreadEntity(
  state: MessagesState,
  thread: ThreadWithRelations,
): ThreadEntity {
  const existing = state.threads[thread.id]
  if (existing) {
    return {
      ...existing,
      thread: { ...existing.thread, ...thread, messages: undefined },
    }
  }

  return normalizeThread(thread)
}

function upsertThread(state: MessagesState, thread: ThreadWithRelations): MessagesState {
  const entry = ensureThreadEntity(state, thread)
  const threads = {
    ...state.threads,
    [thread.id]: entry,
  }

  const existingIndex = state.threadOrder.indexOf(thread.id)
  let threadOrder: string[]

  if (existingIndex >= 0) {
    threadOrder = [...state.threadOrder]
    threadOrder.splice(existingIndex, 1)
    threadOrder.unshift(thread.id)
  } else {
    threadOrder = [thread.id, ...state.threadOrder]
  }

  return { threads, threadOrder }
}

function deleteThread(state: MessagesState, threadId: string): MessagesState {
  if (!state.threads[threadId]) {
    return state
  }

  const { [threadId]: _removed, ...rest } = state.threads
  return {
    threads: rest,
    threadOrder: state.threadOrder.filter((id) => id !== threadId),
  }
}

function upsertMessage(
  state: MessagesState,
  message: MessageWithRelations,
  optimistic = false,
): MessagesState {
  const threadId = message.thread_id
  const existingThread = state.threads[threadId]

  if (!existingThread) {
    const placeholderThread: ThreadWithRelations = {
      building_id: "",
      category: "general",
      created_at: new Date().toISOString(),
      created_by: message.created_by,
      id: threadId,
      is_locked: false,
      metadata: {},
      pinned_message_id: null,
      title: "Pending thread",
      unit_id: null,
      updated_at: message.created_at,
    }

    const created = normalizeThread({ ...placeholderThread, messages: [message] })
    return {
      threads: { ...state.threads, [threadId]: created },
      threadOrder: [threadId, ...state.threadOrder],
    }
  }

  const existingMessage = existingThread.messages[message.id]
  const nextMessage = cloneMessage({ ...existingMessage, ...message }, optimistic)

  const messages = {
    ...existingThread.messages,
    [message.id]: nextMessage,
  }

  let messageOrder = existingThread.messageOrder
  if (!existingMessage) {
    messageOrder = [...messageOrder, message.id]
    messageOrder.sort(
      (a, b) =>
        new Date(messages[a].created_at).getTime() -
        new Date(messages[b].created_at).getTime(),
    )
  }

  const thread = {
    ...existingThread,
    thread: {
      ...existingThread.thread,
      updated_at: message.updated_at ?? existingThread.thread.updated_at,
    },
    messages,
    messageOrder,
  }

  return {
    threads: {
      ...state.threads,
      [threadId]: thread,
    },
    threadOrder: state.threadOrder,
  }
}

function deleteMessage(
  state: MessagesState,
  threadId: string,
  messageId: string,
): MessagesState {
  const thread = state.threads[threadId]
  if (!thread || !thread.messages[messageId]) {
    return state
  }

  const { [messageId]: _removed, ...rest } = thread.messages
  return {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        messages: rest,
        messageOrder: thread.messageOrder.filter((id) => id !== messageId),
      },
    },
    threadOrder: state.threadOrder,
  }
}

function markMessageDeleted(
  state: MessagesState,
  threadId: string,
  messageId: string,
  deletedAt?: string,
): MessagesState {
  const thread = state.threads[threadId]
  if (!thread) {
    return state
  }

  const message = thread.messages[messageId]
  if (!message) {
    return state
  }

  const updated: MessageEntity = {
    ...message,
    is_deleted: true,
    deleted_at: deletedAt ?? new Date().toISOString(),
  }

  return {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        messages: {
          ...thread.messages,
          [messageId]: updated,
        },
      },
    },
    threadOrder: state.threadOrder,
  }
}

function upsertReaction(
  state: MessagesState,
  reaction: ReactionWithProfile,
): MessagesState {
  const thread = Object.values(state.threads).find((candidate) =>
    Boolean(candidate.messages[reaction.message_id]),
  )

  if (!thread) {
    return state
  }

  const message = thread.messages[reaction.message_id]
  if (!message) {
    return state
  }

  const reactions = [...message.reactions]
  const index = reactions.findIndex((item) => item.id === reaction.id)

  if (index >= 0) {
    reactions[index] = reaction
  } else {
    reactions.push(reaction)
  }

  return {
    threads: {
      ...state.threads,
      [thread.thread.id]: {
        ...thread,
        messages: {
          ...thread.messages,
          [message.id]: {
            ...message,
            reactions,
          },
        },
      },
    },
    threadOrder: state.threadOrder,
  }
}

function deleteReaction(
  state: MessagesState,
  threadId: string,
  messageId: string,
  reactionId: string,
): MessagesState {
  const thread = state.threads[threadId]
  if (!thread) {
    return state
  }

  const message = thread.messages[messageId]
  if (!message) {
    return state
  }

  return {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        messages: {
          ...thread.messages,
          [messageId]: {
            ...message,
            reactions: message.reactions.filter((reaction) => reaction.id !== reactionId),
          },
        },
      },
    },
    threadOrder: state.threadOrder,
  }
}

function upsertModeration(
  state: MessagesState,
  moderation: ModerationWithProfile,
): MessagesState {
  const thread = Object.values(state.threads).find((candidate) =>
    Boolean(candidate.messages[moderation.message_id]),
  )

  if (!thread) {
    return state
  }

  const message = thread.messages[moderation.message_id]
  if (!message) {
    return state
  }

  const moderationEntries = [...message.moderation]
  const index = moderationEntries.findIndex((item) => item.id === moderation.id)

  if (index >= 0) {
    moderationEntries[index] = moderation
  } else {
    moderationEntries.push(moderation)
  }

  return {
    threads: {
      ...state.threads,
      [thread.thread.id]: {
        ...thread,
        messages: {
          ...thread.messages,
          [message.id]: {
            ...message,
            moderation: moderationEntries,
          },
        },
      },
    },
    threadOrder: state.threadOrder,
  }
}

function setPinned(state: MessagesState, threadId: string, messageId: string | null): MessagesState {
  const thread = state.threads[threadId]
  if (!thread) {
    return state
  }

  return {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        thread: {
          ...thread.thread,
          pinned_message_id: messageId,
        },
      },
    },
    threadOrder: state.threadOrder,
  }
}

export function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "HYDRATE":
      return buildInitialState(action.threads)
    case "UPSERT_THREAD":
      return upsertThread(state, action.thread)
    case "REMOVE_THREAD":
      return deleteThread(state, action.threadId)
    case "UPSERT_MESSAGE":
      return upsertMessage(state, action.message, action.optimistic)
    case "DELETE_MESSAGE":
      return deleteMessage(state, action.threadId, action.messageId)
    case "MARK_MESSAGE_DELETED":
      return markMessageDeleted(state, action.threadId, action.messageId, action.deletedAt)
    case "UPSERT_REACTION":
      return upsertReaction(state, action.reaction)
    case "DELETE_REACTION":
      return deleteReaction(state, action.threadId, action.messageId, action.reactionId)
    case "UPSERT_MODERATION":
      return upsertModeration(state, action.moderation)
    case "SET_PINNED":
      return setPinned(state, action.threadId, action.messageId)
    default:
      return state
  }
}

function generateOptimisticId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `optimistic-${Math.random().toString(36).slice(2, 14)}`
}

export function createOptimisticMessage(base: Partial<MessageWithRelations>): MessageWithRelations {
  const now = new Date().toISOString()
  return {
    body: base.body ?? "",
    created_at: now,
    created_by: base.created_by ?? "optimistic",
    deleted_at: null,
    id: base.id ?? generateOptimisticId(),
    is_deleted: false,
    metadata: base.metadata ?? {},
    message_type: base.message_type ?? "text",
    parent_message_id: base.parent_message_id ?? null,
    thread_id: base.thread_id ?? "",
    updated_at: now,
    message_moderation: [],
    message_reactions: [],
    created_by_profile: base.created_by_profile,
  }
}

export function ensureMessageMetadata(metadata: unknown): MessageMetadataShape {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }

  return metadata as MessageMetadataShape
}
