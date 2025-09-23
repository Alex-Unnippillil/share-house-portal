import "fake-indexeddb/auto"

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

type WorkboxBackgroundSyncModule = typeof import("workbox-background-sync")
let Queue: WorkboxBackgroundSyncModule["Queue"]

if (typeof globalThis.self === "undefined") {
  // Workbox references the service worker global scope. When running tests in
  // Node we alias self to the global object so the helpers behave as expected.
  // eslint-disable-next-line no-global-assign
  ;(globalThis as unknown as { self: typeof globalThis }).self = globalThis
}

if (!("registration" in (globalThis as typeof globalThis & { registration: unknown }))) {
  ;(globalThis as unknown as { registration: Record<string, unknown> }).registration = {}
}

if (typeof (globalThis as typeof globalThis & { location?: Location }).location === "undefined") {
  ;(globalThis as unknown as { location: Location }).location = {
    href: "https://roomsily.test/",
  } as Location
}

beforeAll(async () => {
  const workbox = await import("workbox-background-sync")
  Queue = workbox.Queue
})

const flows = [
  {
    name: "maintenance",
    endpoint: "https://roomsily.test/api/maintenance",
    payload: {
      title: "Broken dishwasher",
      description: "The dishwasher stopped draining yesterday evening and smells burnt.",
      priority: "high",
    },
  },
  {
    name: "visitors",
    endpoint: "https://roomsily.test/api/visitors",
    payload: {
      guestName: "Jordan", 
      guestEmail: "jordan@example.com",
      checkInDate: "2024-08-01T18:00:00.000Z",
      checkOutDate: "2024-08-03T18:00:00.000Z",
      purpose: "Friend visiting from out of town",
    },
  },
  {
    name: "messaging",
    endpoint: "https://roomsily.test/api/messaging",
    payload: {
      threadId: "chores",
      content: "I picked up extra compost bags while we wait for the delivery.",
    },
  },
] as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe("offline queue replay", () => {
  it("retries queued submissions when connectivity is restored", async () => {
    expect.hasAssertions()

    for (const flow of flows) {
      const queue = new Queue(`test-${flow.name}-${Date.now()}`, {
        forceSyncFallback: true,
      })
      const request = new Request(flow.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow.payload),
      })

      await queue.pushRequest({ request })

      const pendingBeforeReplay = await queue.getAll()
      expect(pendingBeforeReplay).toHaveLength(1)

      const originalFetch = global.fetch
      const fetchMock = vi
        .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      global.fetch = fetchMock as unknown as typeof fetch

      await queue.replayRequests()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).toBeInstanceOf(Request)
      expect((fetchMock.mock.calls[0][0] as Request).url).toBe(flow.endpoint)

      const remaining = await queue.getAll()
      expect(remaining).toHaveLength(0)

      global.fetch = originalFetch
    }
  })
})
