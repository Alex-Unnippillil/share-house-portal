import type {
  RealtimeChannel,
  RealtimeChannelStatus,
  RealtimePresenceState,
} from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import {
  ThreadPresenceManager,
  derivePresenceUsers,
  type ThreadPresenceCursor,
  type ThreadPresenceIdentity,
  type ThreadPresenceState,
} from "@/lib/messaging/thread-presence-manager"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

class MockRealtimeChannel
  implements Partial<RealtimeChannel<unknown, unknown, unknown, unknown>>
{
  public readonly trackedPayloads: Array<Record<string, any>> = []
  public unsubscribed = false

  private readonly statusHandlers: Array<
    (status: RealtimeChannelStatus) => void | Promise<void>
  > = []
  private readonly syncHandlers: Array<() => void> = []
  private presenceStateValue: RealtimePresenceState<Record<string, any>> = {}

  on(event: "presence", filter: { event: string }, callback: () => void) {
    if (event === "presence" && filter.event === "sync") {
      this.syncHandlers.push(callback)
    }

    return this as unknown as RealtimeChannel
  }

  async subscribe(callback: (status: RealtimeChannelStatus) => void | Promise<void>) {
    this.statusHandlers.push(callback)
    return this as unknown as RealtimeChannel
  }

  async track(payload: Record<string, any>) {
    this.trackedPayloads.push(payload)
    const identity = payload.identity as ThreadPresenceIdentity | undefined
    if (!identity) {
      return { data: {}} as any
    }

    const key = identity.id
    const entry = {
      presence_ref: `${key}-${payload.sessionId ?? "session"}`,
      ...payload,
    }

    const records = this.presenceStateValue[key] ?? []
    const existingIndex = records.findIndex(
      (item) => item.sessionId === payload.sessionId,
    )

    if (existingIndex >= 0) {
      records[existingIndex] = entry
    } else {
      records.push(entry)
    }

    this.presenceStateValue[key] = records

    for (const handler of this.syncHandlers) {
      handler()
    }

    return { data: {}} as any
  }

  presenceState<T>() {
    return this.presenceStateValue as RealtimePresenceState<T>
  }

  async unsubscribe() {
    this.unsubscribed = true
    return "ok"
  }

  async emitStatus(status: RealtimeChannelStatus) {
    for (const handler of this.statusHandlers) {
      await handler(status)
    }
  }
}

describe("ThreadPresenceManager", () => {
  it("connects to Supabase and tracks the viewer", async () => {
    const { manager, channel } = createManager()
    const states: ThreadPresenceState[] = []

    const unsubscribe = manager.subscribe((state) => {
      states.push(state)
    })

    expect(states.at(-1)?.status).toBe("connecting")

    await channel.emitStatus("SUBSCRIBED")
    await flushMicrotasks()

    expect(states.at(-1)?.status).toBe("connected")
    expect(channel.trackedPayloads).toHaveLength(1)

    unsubscribe()
    await flushMicrotasks()
    expect(channel.unsubscribed).toBe(true)
  })

  it("updates cursor and typing state for the current viewer", async () => {
    const { manager, channel, identity } = createManager()
    const states: ThreadPresenceState[] = []
    manager.subscribe((state) => states.push(state))

    await channel.emitStatus("SUBSCRIBED")
    await flushMicrotasks()

    const cursor: ThreadPresenceCursor = {
      start: 5,
      end: 5,
      line: 0,
      column: 5,
      textLength: 20,
      timestamp: Date.now(),
    }

    manager.updateCursor(cursor)
    manager.setTyping(true)
    await flushMicrotasks()

    const lastPayload = channel.trackedPayloads.at(-1)
    expect(lastPayload?.cursor).toEqual(cursor)
    expect(lastPayload?.typing).toBe(true)

    const selfUser = manager.snapshot.users.find((user) => user.isSelf)
    expect(selfUser?.id).toBe(identity.id)
    expect(selfUser?.cursor).toEqual(cursor)
    expect(selfUser?.typing).toBe(true)
  })

  it("derives presence state into displayable users", () => {
    const identity: ThreadPresenceIdentity = {
      id: "user-1",
      name: "Jordan",
      initials: "JL",
      color: "#f97316",
    }

    const other: ThreadPresenceIdentity = {
      id: "user-2",
      name: "Avery",
      initials: "AC",
      color: "#6366f1",
    }

    const cursor: ThreadPresenceCursor = {
      start: 2,
      end: 4,
      line: 0,
      column: 2,
      textLength: 12,
      timestamp: 100,
    }

    const state: RealtimePresenceState<any> = {
      [identity.id]: [
        {
          presence_ref: "ref-1",
          identity,
          sessionId: "session-1",
          typing: true,
          cursor,
          lastActiveAt: 50,
        },
      ],
      [other.id]: [
        {
          presence_ref: "ref-2",
          identity: other,
          sessionId: "session-2",
          typing: false,
          lastActiveAt: 75,
        },
      ],
    }

    const users = derivePresenceUsers(state, identity.id, "session-1")
    expect(users).toHaveLength(2)
    expect(users[0].isSelf).toBe(true)
    expect(users[0].cursor).toEqual(cursor)
    expect(users[1].name).toBe("Avery")
    expect(users[1].typing).toBe(false)
  })

  it("surfaces connection errors", async () => {
    const { manager, channel } = createManager()
    const states: ThreadPresenceState[] = []
    manager.subscribe((state) => states.push(state))

    await channel.emitStatus("CHANNEL_ERROR")
    await flushMicrotasks()

    expect(states.at(-1)?.status).toBe("error")
  })
})

function createManager() {
  const channel = new MockRealtimeChannel()
  const client = {
    channel: vi.fn(() => channel as unknown as RealtimeChannel),
  } as unknown as TypedSupabaseClient

  const identity: ThreadPresenceIdentity = {
    id: "user-1",
    name: "Jordan",
    initials: "JL",
    color: "#f97316",
  }

  const manager = new ThreadPresenceManager({
    client,
    threadId: "thread-1",
    identity,
  })

  return { manager, channel, identity }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}
