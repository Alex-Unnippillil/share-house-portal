import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import type {
  MessageWithRelations,
  ReactionWithProfile,
  MessageRow,
} from "@/types/messages"

export function mergeMessageChange(
  current: MessageWithRelations[],
  payload: RealtimePostgresChangesPayload<MessageRow>,
  mapRow: (row: MessageRow) => MessageWithRelations
): MessageWithRelations[] {
  const next = [...current]
  const incoming = payload.new ?? payload.old
  if (!incoming) {
    return next
  }

  const resolveIndex = (row: MessageRow) =>
    next.findIndex(
      (message) =>
        message.id === row.id || (row.client_id && message.client_id === row.client_id)
    )

  if (payload.eventType === "DELETE") {
    const index = resolveIndex(incoming)
    if (index >= 0) {
      next.splice(index, 1)
    }
    return next
  }

  const mapped = mapRow((payload.new ?? incoming) as MessageRow)
  const index = resolveIndex(mapped)

  if (index >= 0) {
    const existing = next[index]
    const merged: MessageWithRelations = {
      ...existing,
      ...mapped,
      reactions:
        mapped.reactions && mapped.reactions.length > 0
          ? mapped.reactions
          : existing.reactions,
      moderation:
        mapped.moderation && mapped.moderation.length > 0
          ? mapped.moderation
          : existing.moderation,
      author: mapped.author ?? existing.author,
      metadata: mapped.metadata ?? existing.metadata,
    }
    next[index] = merged
  } else {
    next.push(mapped)
  }

  return next.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export function mergeReactionChange(
  current: MessageWithRelations[],
  payload: RealtimePostgresChangesPayload<ReactionWithProfile>
): MessageWithRelations[] {
  const next = current.map((message) => ({ ...message, reactions: [...message.reactions] }))
  const incoming = payload.new ?? payload.old
  if (!incoming) {
    return next
  }

  return next.map((message) => {
    if (
      message.id !== incoming.message_id &&
      message.id !== (payload.new?.message_id ?? payload.old?.message_id)
    ) {
      return message
    }

    const reactions = [...message.reactions]

    const findIndex = () =>
      reactions.findIndex((reaction) =>
        incoming.id
          ? reaction.id === incoming.id
          : reaction.profile_id === incoming.profile_id &&
            reaction.reaction === incoming.reaction
      )

    switch (payload.eventType) {
      case "INSERT": {
        const index = findIndex()
        if (index === -1) {
          reactions.push({ ...incoming })
        }
        break
      }
      case "UPDATE": {
        const index = findIndex()
        if (index >= 0) {
          reactions[index] = { ...reactions[index], ...incoming }
        }
        break
      }
      case "DELETE": {
        const index = findIndex()
        if (index >= 0) {
          reactions.splice(index, 1)
        }
        break
      }
      default:
        break
    }

    return { ...message, reactions }
  })
}
