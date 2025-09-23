import { describe, expect, it, vi } from "vitest"

import type { MessagesClient } from "@/lib/data/messages"
import { fetchThreadMessages, insertThreadMessage } from "@/lib/data/messages"

describe("messages data access", () => {
  const messageRow = {
    id: "msg-1",
    thread_id: "chore-rotation",
    author_id: "11111111-1111-1111-1111-111111111111",
    content_html: "<p><strong>Bold</strong> update</p>",
    content_markdown: "**Bold** update",
    created_at: "2024-03-01T12:00:00.000Z",
    updated_at: "2024-03-01T12:00:00.000Z",
  }

  it("persists html and markdown when inserting a message", async () => {
    const single = vi.fn().mockResolvedValue({ data: messageRow, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const from = vi.fn().mockReturnValue({ insert })

    const supabase = { from } as unknown as MessagesClient

    const payload = {
      threadId: messageRow.thread_id,
      authorId: messageRow.author_id,
      contentHtml: messageRow.content_html,
      contentMarkdown: messageRow.content_markdown,
    }

    const result = await insertThreadMessage({ client: supabase, message: payload })

    expect(from).toHaveBeenCalledWith("messages")
    expect(insert).toHaveBeenCalledWith({
      thread_id: payload.threadId,
      author_id: payload.authorId,
      content_html: payload.contentHtml,
      content_markdown: payload.contentMarkdown,
    })
    expect(select).toHaveBeenCalled()
    expect(single).toHaveBeenCalled()
    expect(result).toEqual(messageRow)
  })

  it("throws when Supabase returns an error while inserting", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const from = vi.fn().mockReturnValue({ insert })

    const supabase = { from } as unknown as MessagesClient

    await expect(
      insertThreadMessage({
        client: supabase,
        message: {
          threadId: messageRow.thread_id,
          authorId: messageRow.author_id,
          contentHtml: messageRow.content_html,
          contentMarkdown: messageRow.content_markdown,
        },
      })
    ).rejects.toThrow(/Failed to insert message: boom/)
  })

  it("selects ordered messages for a thread", async () => {
    const order = vi.fn().mockResolvedValue({ data: [messageRow], error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const supabase = { from } as unknown as MessagesClient

    const messages = await fetchThreadMessages({ client: supabase, threadId: messageRow.thread_id })

    expect(from).toHaveBeenCalledWith("messages")
    expect(select).toHaveBeenCalledWith(
      "id, thread_id, author_id, content_html, content_markdown, created_at, updated_at"
    )
    expect(eq).toHaveBeenCalledWith("thread_id", messageRow.thread_id)
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true })
    expect(messages).toEqual([messageRow])
  })

  it("throws when fetching messages fails", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "nope" } })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const supabase = { from } as unknown as MessagesClient

    await expect(
      fetchThreadMessages({ client: supabase, threadId: messageRow.thread_id })
    ).rejects.toThrow(/Failed to fetch messages: nope/)
  })
})
