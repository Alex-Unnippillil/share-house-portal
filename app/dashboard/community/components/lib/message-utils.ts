import type {
  CommunityChannel,
  CommunityMessage,
  CommunityThread,
} from "../../types"

export type MessageChange =
  | { type: "INSERT"; record: CommunityMessage }
  | { type: "UPDATE"; record: CommunityMessage }
  | { type: "DELETE"; record: { id: string } }

export type ChannelChange =
  | { type: "INSERT"; record: CommunityChannel }
  | { type: "UPDATE"; record: CommunityChannel }
  | { type: "DELETE"; record: { id: string } }

const collectDescendantIds = (
  messages: CommunityMessage[],
  rootId: string
) => {
  const ids = new Set<string>()
  const stack = [rootId]

  while (stack.length) {
    const current = stack.pop()!
    if (ids.has(current)) {
      continue
    }

    ids.add(current)
    messages.forEach((message) => {
      if (message.parent_id === current) {
        stack.push(message.id)
      }
    })
  }

  return ids
}

export const buildThreads = (
  messages: CommunityMessage[]
): CommunityThread[] => {
  const threadMap = new Map<string, CommunityThread>()

  messages.forEach((message) => {
    const targetId = message.parent_id ?? message.id
    const existing = threadMap.get(targetId)

    if (!existing) {
      if (message.parent_id) {
        const parent = messages.find((candidate) => candidate.id === message.parent_id)
        if (!parent) {
          return
        }

        threadMap.set(parent.id, {
          root: parent,
          replies: [message],
        })
        return
      }

      threadMap.set(message.id, {
        root: message,
        replies: [],
      })
      return
    }

    if (message.parent_id) {
      existing.replies.push(message)
    } else if (!message.parent_id && existing.root.id === message.id) {
      existing.root = message
    }
  })

  const threads = Array.from(threadMap.values())

  threads.forEach((thread) => {
    thread.replies.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  })

  threads.sort((a, b) => {
    if (a.root.is_pinned !== b.root.is_pinned) {
      return a.root.is_pinned ? -1 : 1
    }

    return (
      new Date(b.root.created_at).getTime() -
      new Date(a.root.created_at).getTime()
    )
  })

  return threads
}

const mergeMessage = (
  existing: CommunityMessage | undefined,
  next: CommunityMessage
): CommunityMessage => {
  if (!existing) {
    return { ...next, pending: false }
  }

  return {
    ...existing,
    ...next,
    pending: false,
    author: next.author ?? existing.author,
  }
}

export const applyRealtimeMessageChange = (
  messages: CommunityMessage[],
  change: MessageChange
): CommunityMessage[] => {
  if (change.type === "INSERT") {
    const index = messages.findIndex((message) => message.id === change.record.id)
    if (index >= 0) {
      const nextMessages = messages.slice()
      nextMessages[index] = mergeMessage(messages[index], change.record)
      return nextMessages
    }

    return [...messages, mergeMessage(undefined, change.record)]
  }

  if (change.type === "UPDATE") {
    const index = messages.findIndex((message) => message.id === change.record.id)
    if (index === -1) {
      return [...messages, mergeMessage(undefined, change.record)]
    }

    const nextMessages = messages.slice()
    nextMessages[index] = mergeMessage(messages[index], change.record)
    return nextMessages
  }

  const idsToRemove = collectDescendantIds(messages, change.record.id)
  return messages.filter((message) => !idsToRemove.has(message.id))
}

export const applyRealtimeChannelChange = (
  channels: CommunityChannel[],
  change: ChannelChange
): CommunityChannel[] => {
  if (change.type === "DELETE") {
    return channels.filter((channel) => channel.id !== change.record.id)
  }

  const index = channels.findIndex((channel) => channel.id === change.record.id)
  if (index === -1) {
    return [...channels, change.record]
  }

  const nextChannels = channels.slice()
  nextChannels[index] = { ...channels[index], ...change.record }
  return nextChannels
}

export const canModerateMessage = (viewerRole: string | null | undefined) =>
  viewerRole === "admin"

export const canEditMessage = (
  viewerId: string | null | undefined,
  message: CommunityMessage
) => Boolean(viewerId && viewerId === message.author_id)

export const canPinThread = (
  viewerRole: string | null | undefined,
  message: CommunityMessage
) => viewerRole === "admin" && !message.parent_id

export const getInitials = (name?: string | null) => {
  if (!name) {
    return "?"
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .padEnd(2, "?")
}

export const createNotificationPreview = (content: string) => {
  const normalized = content.trim().replace(/\s+/g, " ")
  if (normalized.length <= 120) {
    return normalized
  }
  return `${normalized.slice(0, 117)}...`
}
