import { PassThrough } from "node:stream"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  configureLogger,
  getCurrentLogContext,
  getLogger,
  setLogContext,
  withRequestLogging,
} from "@/lib/logger"

function collectLogs(stream: PassThrough) {
  const entries: Array<Record<string, unknown>> = []
  stream.on("data", (chunk) => {
    const lines = chunk
      .toString()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      entries.push(JSON.parse(line))
    }
  })
  return entries
}

describe("structured logger", () => {
  let stream: PassThrough
  let logs: Array<Record<string, unknown>>

  beforeEach(() => {
    stream = new PassThrough()
    logs = collectLogs(stream)
    configureLogger({ destination: stream })
  })

  afterEach(() => {
    stream.removeAllListeners()
    stream.end()
    configureLogger()
  })

  it("propagates request context and user identifiers", async () => {
    const handler = withRequestLogging(async (request: Request) => {
      let logger = getLogger()
      logger.info({ action: "start" }, "processing request")

      setLogContext({ userId: "user-123" })
      logger = getLogger()
      logger.warn({ action: "after-user" }, "user resolved")

      return new Response(null, { status: 204 })
    })

    await handler(
      new Request("https://example.com/api/test", {
        headers: { "x-request-id": "req-123" },
      })
    )

    expect(logs).toHaveLength(2)

    expect(logs[0]).toMatchObject({
      level: 30,
      message: "processing request",
      action: "start",
      requestId: "req-123",
    })

    expect(logs[1]).toMatchObject({
      level: 40,
      message: "user resolved",
      action: "after-user",
      requestId: "req-123",
      userId: "user-123",
    })
  })

  it("generates request identifiers when none are provided", async () => {
    const handler = withRequestLogging(async () => {
      getLogger().info("generated request identifier")
      return new Response(null, { status: 200 })
    })

    await handler(new Request("https://example.com/api/test"))

    expect(logs).toHaveLength(1)
    expect(typeof logs[0].requestId).toBe("string")
    expect((logs[0].requestId as string).length).toBeGreaterThan(0)
  })

  it("exposes the active log context for diagnostics", async () => {
    const handler = withRequestLogging(async (request: Request) => {
      expect(getCurrentLogContext()).toMatchObject({
        requestId: request.headers.get("x-request-id"),
      })

      return new Response(null, { status: 202 })
    })

    await handler(
      new Request("https://example.com/api/test", {
        headers: { "x-request-id": "context-check" },
      })
    )
  })
})
