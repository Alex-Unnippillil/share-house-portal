import { describe, expect, it } from "vitest"

import {
  createInitialState,
  createOptimisticMessage,
  messageReducer,
  normalizeAttachments,
  type MessageRow,
} from "@/app/(tenant)/messages/message-reducer"

const baseTimestamp = "2024-01-01T00:00:00.000Z"

const createRow = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  attachments: (
    overrides.attachments ?? ([] as unknown as MessageRow["attachments"])
  ) as MessageRow["attachments"],
  author_id: overrides.author_id ?? "user-1",
  body: overrides.body ?? "Hello from server",
  created_at: overrides.created_at ?? baseTimestamp,
  household_id: overrides.household_id ?? "house-1",
  id: overrides.id ?? "message-1",
  thread_id: overrides.thread_id ?? "thread-1",
  updated_at: overrides.updated_at ?? overrides.created_at ?? baseTimestamp,
})

describe("message reducer", () => {
  it("sorts incoming rows chronologically", () => {
    const newest = createRow({ id: "message-new", created_at: "2024-01-05T08:00:00.000Z" })
    const oldest = createRow({ id: "message-old", created_at: "2023-12-28T20:00:00.000Z" })

    const state = createInitialState([newest, oldest])

    expect(state.messages).toHaveLength(2)
    expect(state.messages[0].id).toBe("message-old")
    expect(state.messages[1].id).toBe("message-new")
  })

  it("tracks optimistic messages and replaces them on confirmation", () => {
    const initialState = createInitialState([])
    const optimistic = createOptimisticMessage({
      clientId: "client-1",
      body: "Taking the trash out tonight",
      threadId: "thread-1",
      householdId: "house-1",
      authorId: "user-1",
      createdAt: "2024-01-02T10:00:00.000Z",
    })

    const pendingState = messageReducer(initialState, {
      type: "optimistic-add",
      message: optimistic,
    })

    expect(pendingState.messages).toHaveLength(1)
    expect(pendingState.messages[0].status).toBe("pending")

    const confirmedRow = createRow({
      id: "server-1",
      body: optimistic.body,
      author_id: optimistic.author_id,
      created_at: optimistic.created_at,
    })

    const confirmedState = messageReducer(pendingState, {
      type: "confirm",
      clientId: optimistic.clientId,
      message: confirmedRow,
    })

    expect(confirmedState.messages).toHaveLength(1)
    expect(confirmedState.messages[0].id).toBe("server-1")
    expect(confirmedState.messages[0].status).toBe("confirmed")
  })

  it("marks pending messages as failed when an error occurs", () => {
    const optimistic = createOptimisticMessage({
      clientId: "client-2",
      body: "Washer is free now",
      threadId: "thread-1",
      householdId: "house-1",
      authorId: "user-2",
    })

    const stateWithPending = messageReducer(createInitialState([]), {
      type: "optimistic-add",
      message: optimistic,
    })

    const failedState = messageReducer(stateWithPending, {
      type: "fail",
      clientId: optimistic.clientId,
    })

    expect(failedState.messages[0].status).toBe("failed")
  })

  it("deduplicates realtime inserts that correspond to optimistic entries", () => {
    const optimistic = createOptimisticMessage({
      clientId: "client-3",
      body: "Can someone grab groceries?",
      threadId: "thread-1",
      householdId: "house-1",
      authorId: "user-3",
      createdAt: "2024-01-03T09:30:00.000Z",
    })

    const pendingState = messageReducer(createInitialState([]), {
      type: "optimistic-add",
      message: optimistic,
    })

    const realtimeRow = createRow({
      id: "server-3",
      body: optimistic.body,
      author_id: optimistic.author_id,
      created_at: optimistic.created_at,
    })

    const afterRealtime = messageReducer(pendingState, {
      type: "receive",
      message: realtimeRow,
    })

    expect(afterRealtime.messages).toHaveLength(1)
    expect(afterRealtime.messages[0].id).toBe("server-3")
    expect(afterRealtime.messages[0].status).toBe("confirmed")
  })

  it("applies updates to an existing message including attachment metadata", () => {
    const existingRow = createRow({ id: "server-4" })
    const state = createInitialState([existingRow])

    const updatedRow = createRow({
      id: "server-4",
      body: "Lease signed and uploaded",
      attachments: [
        {
          id: "file-1",
          name: "lease.pdf",
          size: 2048,
          content_type: "application/pdf",
        },
      ] as unknown as MessageRow["attachments"],
    })

    const updatedState = messageReducer(state, {
      type: "update",
      message: updatedRow,
    })

    expect(updatedState.messages[0].body).toBe("Lease signed and uploaded")
    expect(updatedState.messages[0].attachments).toHaveLength(1)
    expect(updatedState.messages[0].attachments[0]).toMatchObject({
      id: "file-1",
      name: "lease.pdf",
      size: 2048,
      contentType: "application/pdf",
    })
  })

  it("normalizes a variety of attachment metadata formats", () => {
    const normalized = normalizeAttachments(
      [
        {
          id: "file-1",
          name: "trash-schedule.pdf",
          size: "4096",
          content_type: "application/pdf",
        },
        {
          filename: "kitchen.png",
          fileSize: 5120,
          mimeType: "image/png",
        },
        "ignore-me",
      ] as unknown as MessageRow["attachments"]
    )

    expect(normalized).toHaveLength(2)
    expect(normalized[0]).toMatchObject({
      id: "file-1",
      name: "trash-schedule.pdf",
      size: 4096,
      contentType: "application/pdf",
    })
    expect(normalized[1]).toMatchObject({
      id: "kitchen.png",
      name: "kitchen.png",
      size: 5120,
      contentType: "image/png",
    })
  })
})
