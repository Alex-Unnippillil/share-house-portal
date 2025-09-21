import type { MessageWithRelations, ThreadWithRelations, PollMetadata } from "@/types/messages"

export const mapMessage = (row: any): MessageWithRelations => ({
  ...row,
  metadata: (row.metadata ?? {}) as PollMetadata,
  author: row.author ?? null,
  reactions: Array.isArray(row.reactions)
    ? row.reactions.map((reaction: any) => ({
        ...reaction,
        profile: reaction.profile ?? null,
      }))
    : [],
  moderation: Array.isArray(row.moderation)
    ? row.moderation.map((entry: any) => ({
        ...entry,
        performed_by_profile: entry.performed_by_profile ?? null,
      }))
    : [],
})

export const mapThread = (row: any): ThreadWithRelations => ({
  ...row,
  metadata: row.metadata ?? {},
  created_by_profile: row.created_by_profile ?? null,
  pinned_by_profile: row.pinned_by_profile ?? null,
  unit: row.unit ?? null,
  building: row.building ?? null,
  messages: Array.isArray(row.messages)
    ? row.messages.map((message: any) => mapMessage(message))
    : [],
})
