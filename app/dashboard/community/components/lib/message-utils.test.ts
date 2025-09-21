import { describe, expect, it } from "vitest"

import type { CommunityMessage } from "@/app/dashboard/community/types"
import {
  applyRealtimeMessageChange,
  buildThreads,
  canModerateMessage,
  canPinThread,
  createNotificationPreview,
} from "@/app/dashboard/community/components/lib/message-utils"

describe("message utils", () => {
  const baseMessage: CommunityMessage = {
    id: "thread-1",
    channel_id: "channel-1",
    author_id: "resident-1",
    parent_id: null,
    title: "Welcome",
    content: "Welcome to the community",
    created_at: new Date("2024-01-01T12:00:00Z").toISOString(),
    is_deleted: false,
    is_pinned: false,
    author: null,
  }

  it("adds inserted messages and keeps existing ones", () => {
    const initial: CommunityMessage[] = []
    const inserted: CommunityMessage = {
      ...baseMessage,
      id: "thread-2",
      content: "Fresh update",
      created_at: new Date("2024-01-02T12:00:00Z").toISOString(),
    }

    const next = applyRealtimeMessageChange(initial, {
      type: "INSERT",
      record: inserted,
    })

    expect(next).toHaveLength(1)
    expect(next[0].id).toBe("thread-2")
    expect(next[0].pending).toBe(false)
  })

  it("updates messages in place", () => {
    const initial: CommunityMessage[] = [baseMessage]
    const updated: CommunityMessage = {
      ...baseMessage,
      content: "Updated content",
    }

    const next = applyRealtimeMessageChange(initial, {
      type: "UPDATE",
      record: updated,
    })

    expect(next).toHaveLength(1)
    expect(next[0].content).toBe("Updated content")
  })

  it("removes deleted messages and their replies", () => {
    const reply: CommunityMessage = {
      ...baseMessage,
      id: "reply-1",
      parent_id: baseMessage.id,
      content: "Reply",
      created_at: new Date("2024-01-01T12:05:00Z").toISOString(),
    }

    const nestedReply: CommunityMessage = {
      ...reply,
      id: "reply-2",
      parent_id: reply.id,
      created_at: new Date("2024-01-01T12:06:00Z").toISOString(),
    }

    const next = applyRealtimeMessageChange([baseMessage, reply, nestedReply], {
      type: "DELETE",
      record: { id: baseMessage.id },
    })

    expect(next).toHaveLength(0)
  })

  it("builds threads sorted by pin status and date", () => {
    const pinned: CommunityMessage = {
      ...baseMessage,
      id: "thread-pinned",
      is_pinned: true,
      created_at: new Date("2024-01-03T12:00:00Z").toISOString(),
    }
    const recent: CommunityMessage = {
      ...baseMessage,
      id: "thread-recent",
      created_at: new Date("2024-01-04T12:00:00Z").toISOString(),
    }

    const threads = buildThreads([baseMessage, pinned, recent])

    expect(threads[0].root.id).toBe("thread-pinned")
    expect(threads[1].root.id).toBe("thread-recent")
  })

  it("only allows admins to moderate or pin threads", () => {
    expect(canModerateMessage("admin")).toBe(true)
    expect(canModerateMessage("resident")).toBe(false)
    expect(canPinThread("admin", baseMessage)).toBe(true)
    expect(canPinThread("resident", baseMessage)).toBe(false)
    expect(canPinThread("admin", { ...baseMessage, parent_id: baseMessage.id })).toBe(false)
  })

  it("creates compact notification previews", () => {
    const preview = createNotificationPreview(
      "This is a very long message that should be truncated when converted into a notification preview for residents to quickly read."
    )

    expect(preview.length).toBeLessThanOrEqual(120)
    expect(preview.endsWith("...")).toBe(true)
  })
})
