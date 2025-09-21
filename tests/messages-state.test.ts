import { describe, expect, it } from "vitest"

import {
  buildInitialState,
  createOptimisticMessage,
  messagesReducer,
} from "@/lib/messages/state"
import type { MessageWithRelations, ThreadWithRelations } from "@/types/messages"

describe("messages state", () => {
  const now = new Date().toISOString()
  const baseThread: ThreadWithRelations = {
    id: "thread-1",
    building_id: "building-1",
    unit_id: "unit-1",
    created_at: now,
    updated_at: now,
    created_by: "user-1",
    title: "General updates",
    category: "general",
    metadata: {},
    pinned_message_id: null,
    is_locked: false,
    created_by_profile: null,
    messages: [],
  }

  it("hydrates threads and messages", () => {
    const state = buildInitialState([baseThread])
    expect(state.threadOrder).toHaveLength(1)
    expect(state.threads["thread-1"].thread.title).toBe("General updates")
  })

  it("upserts messages with optimistic entries", () => {
    const state = buildInitialState([baseThread])
    const optimistic = createOptimisticMessage({
      thread_id: "thread-1",
      body: "Hello",
      created_by: "user-1",
    })

    const withMessage = messagesReducer(state, {
      type: "UPSERT_MESSAGE",
      message: optimistic,
      optimistic: true,
    })

    expect(withMessage.threads["thread-1"].messageOrder).toContain(optimistic.id)
  })

  it("marks messages as deleted", () => {
    const state = buildInitialState([baseThread])
    const message: MessageWithRelations = {
      id: "message-1",
      thread_id: "thread-1",
      parent_message_id: null,
      created_by: "user-1",
      body: "Announcement",
      message_type: "text",
      metadata: {},
      is_deleted: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      message_reactions: [],
      message_moderation: [],
      created_by_profile: null,
    }

    const afterInsert = messagesReducer(state, {
      type: "UPSERT_MESSAGE",
      message,
    })

    const afterDelete = messagesReducer(afterInsert, {
      type: "MARK_MESSAGE_DELETED",
      messageId: "message-1",
      threadId: "thread-1",
      deletedAt: now,
    })

    expect(afterDelete.threads["thread-1"].messages["message-1"].is_deleted).toBe(true)
  })
})
