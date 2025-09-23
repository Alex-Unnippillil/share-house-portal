import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Message, MessageConflictPayload } from "@/app/messaging/actions"

vi.mock("@/app/messaging/actions", () => ({
  updateMessageAction: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { updateMessageAction } from "@/app/messaging/actions"
import { MessageEditor } from "@/components/messaging/message-editor"

const baseMessage: Message = {
  id: "msg-1",
  content: "Initial announcement",
  created_at: "2024-05-01T10:00:00.000Z",
  updated_at: "2024-05-02T08:00:00.000Z",
  version: 1,
  thread_id: "thread-1",
  author_id: "author-1",
  reactions: [],
}

function buildConflict(partial?: Partial<MessageConflictPayload>): MessageConflictPayload {
  return {
    message: "This message changed.",
    current: {
      ...baseMessage,
      content: "Server side update",
      version: 2,
      updated_at: "2024-05-02T09:00:00.000Z",
    },
    incoming: {
      content: "User draft",
    },
    latestVersion: 2,
    latestUpdatedAt: "2024-05-02T09:00:00.000Z",
    ...partial,
  }
}

describe("MessageEditor optimistic concurrency", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("allows selecting the latest version when conflicts occur", async () => {
    const user = userEvent.setup()
    const updateMessageActionMock = updateMessageAction as unknown as vi.Mock

    updateMessageActionMock.mockResolvedValueOnce({
      success: false,
      status: "conflict",
      conflict: buildConflict(),
    })

    updateMessageActionMock.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseMessage,
        content: "Server side update",
        version: 3,
        updated_at: "2024-05-02T10:00:00.000Z",
      },
    })

    render(<MessageEditor message={baseMessage} />)

    const editButton = screen.getByRole("button", { name: /edit message/i })
    await user.click(editButton)

    const textarea = screen.getByRole("textbox")
    await user.clear(textarea)
    await user.type(textarea, "User draft")

    const saveButton = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveButton)

    await screen.findByText(/resolve message conflict/i)

    const theirsButton = screen.getByRole("button", { name: /use latest version/i })
    await user.click(theirsButton)

    const applyButton = screen.getByRole("button", { name: /apply selection/i })
    await user.click(applyButton)

    await waitFor(() => expect(updateMessageActionMock).toHaveBeenCalledTimes(2))

    const secondCall = updateMessageActionMock.mock.calls[1][0]
    expect(secondCall.resolution?.type).toBe("keep_theirs")
    expect(secondCall.updates.content).toBe("Server side update")
  })
})
