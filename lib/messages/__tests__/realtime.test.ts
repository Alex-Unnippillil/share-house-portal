import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  mergeMessageChange,
  mergeReactionChange,
} from "@/lib/messages/realtime"
import type {
  MessageWithRelations,
  ReactionWithProfile,
} from "@/types/messages"

const baseMessage: MessageWithRelations = {
  id: "message-1",
  thread_id: "thread-1",
  parent_message_id: null,
  building_id: "building-1",
  unit_id: "unit-1",
  author_id: "author-1",
  content: "Hello",
  message_type: "text",
  metadata: {},
  status: "active",
  client_id: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  deleted_at: null,
  author: null,
  reactions: [],
  moderation: [],
}

const mapRow = (row: any): MessageWithRelations => ({
  ...row,
  author: row.author ?? null,
  reactions: row.reactions ?? [],
  moderation: row.moderation ?? [],
})

const toRowPayload = (
  eventType: "INSERT" | "UPDATE" | "DELETE",
  message: MessageWithRelations
): RealtimePostgresChangesPayload<any> => {
  const { reactions, moderation, author, ...row } = message
  return {
    eventType,
    schema: "public",
    table: "messages",
    new: eventType === "DELETE" ? null : row,
    old: eventType === "DELETE" ? row : null,
  }
}

describe("mergeMessageChange", () => {
  it("inserts messages in chronological order", () => {
    const existing = [
      {
        ...baseMessage,
        id: "message-early",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]
    const incoming: MessageWithRelations = {
      ...baseMessage,
      id: "message-late",
      created_at: "2024-01-02T00:00:00.000Z",
    }

    const result = mergeMessageChange(
      existing,
      toRowPayload("INSERT", incoming),
      mapRow
    )

    expect(result.map((message) => message.id)).toEqual([
      "message-early",
      "message-late",
    ])
  })

  it("updates an existing message while preserving reactions", () => {
    const existing: MessageWithRelations[] = [
      {
        ...baseMessage,
        reactions: [
          {
            id: "reaction-1",
            message_id: baseMessage.id,
            profile_id: "profile-1",
            reaction: "👍",
            created_at: baseMessage.created_at,
            building_id: baseMessage.building_id,
            unit_id: baseMessage.unit_id,
            profile: null,
          },
        ],
      },
    ]
    const incoming: MessageWithRelations = {
      ...baseMessage,
      content: "Updated",
      reactions: [],
    }

    const result = mergeMessageChange(
      existing,
      toRowPayload("UPDATE", incoming),
      mapRow
    )

    expect(result).toHaveLength(1)
    expect(result[0].content).toBe("Updated")
    expect(result[0].reactions).toHaveLength(1)
  })

  it("removes a message on delete", () => {
    const existing = [baseMessage]

    const result = mergeMessageChange(
      existing,
      toRowPayload("DELETE", baseMessage),
      mapRow
    )

    expect(result).toHaveLength(0)
  })
})

describe("mergeReactionChange", () => {
  const reactionBase: ReactionWithProfile = {
    id: "reaction-1",
    message_id: baseMessage.id,
    profile_id: "profile-1",
    reaction: "👍",
    created_at: "2024-01-01T00:00:00.000Z",
    building_id: baseMessage.building_id,
    unit_id: baseMessage.unit_id,
    profile: null,
  }

  const toReactionPayload = (
    eventType: "INSERT" | "UPDATE" | "DELETE",
    reaction: ReactionWithProfile
  ): RealtimePostgresChangesPayload<ReactionWithProfile> => ({
    eventType,
    schema: "public",
    table: "message_reactions",
    new: eventType === "DELETE" ? null : reaction,
    old: eventType === "DELETE" ? reaction : null,
  })

  it("adds new reactions", () => {
    const existing = [baseMessage]

    const result = mergeReactionChange(
      existing,
      toReactionPayload("INSERT", reactionBase)
    )

    expect(result[0].reactions).toHaveLength(1)
    expect(result[0].reactions[0].reaction).toBe("👍")
  })

  it("updates existing reactions", () => {
    const updatedReaction: ReactionWithProfile = {
      ...reactionBase,
      reaction: "❤️",
    }
    const existing: MessageWithRelations[] = [
      {
        ...baseMessage,
        reactions: [reactionBase],
      },
    ]

    const result = mergeReactionChange(
      existing,
      toReactionPayload("UPDATE", updatedReaction)
    )

    expect(result[0].reactions).toHaveLength(1)
    expect(result[0].reactions[0].reaction).toBe("❤️")
  })

  it("removes reactions on delete", () => {
    const existing: MessageWithRelations[] = [
      {
        ...baseMessage,
        reactions: [reactionBase],
      },
    ]

    const result = mergeReactionChange(
      existing,
      toReactionPayload("DELETE", reactionBase)
    )

    expect(result[0].reactions).toHaveLength(0)
  })
})
