import React from "react"
import { Buffer } from "buffer"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { FeedbackWidget } from "@/components/feedback/feedback-widget"

describe("FeedbackWidget", () => {
  const createFetchMock = () =>
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input)

      if (url.includes("/api/support/feedback")) {
        return new Response(JSON.stringify({ id: "support-123" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      }

      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch

  const assignFetchMock = (mock: typeof fetch) => {
    global.fetch = mock
    window.fetch = mock
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "info").mockImplementation(() => {})
    vi.spyOn(console, "debug").mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("packages console logs and network traces with the submission payload", async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    assignFetchMock(fetchMock)

    render(<FeedbackWidget />)

    console.error("Widget exploded", { status: 500 })

    await fetch("https://example.com/diagnostic", { method: "POST" })

    const openButton = screen.getByRole("button", { name: /feedback/i })
    await user.click(openButton)

    const notesField = await screen.findByLabelText(/tell us what's happening/i)
    await user.type(notesField, "App crashed while saving a lease draft.")

    const submitButton = screen.getByRole("button", { name: /send to support/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([target]) => typeof target === "string" && target.includes("/api/support/feedback")
        )
      ).toBe(true)
    })

    const supportCall = fetchMock.mock.calls.find(
      ([target]) => typeof target === "string" && target.includes("/api/support/feedback")
    ) as [string, RequestInit]

    expect(supportCall).toBeDefined()

    const [, init] = supportCall
    expect(init?.method).toBe("POST")
    expect(typeof init?.body).toBe("string")

    const parsed = JSON.parse(init?.body as string)

    expect(parsed.consoleLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("Widget exploded") }),
      ])
    )
    expect(parsed.networkEntries.length).toBeGreaterThan(0)

    const logsAttachment = parsed.attachments.find((attachment: { filename: string }) =>
      attachment.filename.includes("console-logs")
    )

    expect(logsAttachment).toBeDefined()

    const decodedLogs = Buffer.from(logsAttachment.content, "base64").toString("utf-8")
    expect(decodedLogs).toContain("Widget exploded")
  })

  it("exposes an accessible trigger and labelled form controls", async () => {
    const user = userEvent.setup()
    assignFetchMock(createFetchMock())

    render(<FeedbackWidget />)

    const openButton = screen.getByRole("button", { name: /feedback/i })
    expect(openButton).toBeInTheDocument()

    await user.click(openButton)

    const notesField = await screen.findByLabelText(/tell us what's happening/i)
    expect(notesField).toHaveAttribute("id", "feedback-notes")
    expect(screen.getByText(/console entries captured/i)).toBeInTheDocument()
  })
})
