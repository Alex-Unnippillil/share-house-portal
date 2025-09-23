import { describe, expect, it, vi } from "vitest"

import { buildPresenceChannelName, createPresenceChannel, type PresenceEntity, type PresenceMetadata, type PresenceProfile } from "@/lib/realtime/presence"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

class MockRealtimeChannel {
  name = ""
  presenceKey = ""
  state: Record<string, PresenceMetadata[]> = {}
  handlers: Record<string, Array<() => void>> = {}
  subscribeCalls = 0
  trackCalls = 0
  updateCalls = 0
  untrackCalls = 0
  unsubscribeCalls = 0
  lastTracked: PresenceMetadata | null = null
  currentSessionId: string | null = null

  on(_type: string, filter: { event?: string }, callback: () => void) {
    const event = filter.event ?? "sync"
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }
    this.handlers[event]!.push(callback)
    return this as unknown as RealtimeChannel
  }

  subscribe(callback?: (status: string) => void) {
    this.subscribeCalls += 1
    if (callback) {
      callback("SUBSCRIBED")
    }
    return this as unknown as RealtimeChannel
  }

  async track(payload: PresenceMetadata) {
    this.trackCalls += 1
    this.lastTracked = payload
    this.currentSessionId = payload.sessionId

    const list = this.state[this.presenceKey] ?? []
    const filtered = list.filter((item) => item.sessionId !== payload.sessionId)
    this.state[this.presenceKey] = [...filtered, payload]

    this.emit("sync")
    return "ok" as const
  }

  async update(payload: PresenceMetadata) {
    this.updateCalls += 1
    const list = this.state[this.presenceKey] ?? []
    this.state[this.presenceKey] = list.map((item) =>
      item.sessionId === payload.sessionId ? { ...item, ...payload } : item,
    )
    this.emit("sync")
    return "ok" as const
  }

  async untrack() {
    this.untrackCalls += 1
    if (this.currentSessionId) {
      const list = this.state[this.presenceKey] ?? []
      this.state[this.presenceKey] = list.filter(
        (item) => item.sessionId !== this.currentSessionId,
      )
    } else {
      delete this.state[this.presenceKey]
    }
    this.emit("sync")
    return "ok" as const
  }

  async unsubscribe() {
    this.unsubscribeCalls += 1
    return "ok" as const
  }

  presenceState() {
    return this.state
  }

  setPresenceKey(key: string) {
    this.presenceKey = key
  }

  addExternalPresence(userId: string, payload: PresenceMetadata) {
    const list = this.state[userId] ?? []
    const filtered = list.filter((item) => item.sessionId !== payload.sessionId)
    this.state[userId] = [...filtered, { ...payload, userId }]
    this.emit("sync")
  }

  removeExternalPresence(userId: string, sessionId: string) {
    const list = this.state[userId] ?? []
    this.state[userId] = list.filter((item) => item.sessionId !== sessionId)
    if (this.state[userId]?.length === 0) {
      delete this.state[userId]
    }
    this.emit("sync")
  }

  private emit(event: string) {
    for (const handler of this.handlers[event] ?? []) {
      handler()
    }
  }
}

function createMockClient(channel: MockRealtimeChannel) {
  const client = {
    channel: vi.fn(
      (name: string, config?: { config?: { presence?: { key?: string } } }) => {
        channel.name = name
        const key = config?.config?.presence?.key
        if (key) {
          channel.setPresenceKey(key)
        }
        return channel as unknown as RealtimeChannel
      },
    ),
  }

  return client as unknown as TypedSupabaseClient
}

describe("createPresenceChannel", () => {
  const entity: PresenceEntity = { type: "thread", id: "chore-rotation" }
  const profile: PresenceProfile = {
    id: "resident-maya",
    displayName: "Maya Patel",
    avatarUrl: null,
    accentColor: "#0ea5e9",
  }

  it("joins the realtime presence channel and emits the current session", () => {
    const channel = new MockRealtimeChannel()
    const client = createMockClient(channel)
    const onSync = vi.fn()

    const handle = createPresenceChannel(client, {
      entity,
      profile,
      throttleMs: 0,
      onSync,
    })

    expect(channel.name).toBe(buildPresenceChannelName(entity))
    expect(channel.subscribeCalls).toBe(1)
    expect(channel.trackCalls).toBe(1)
    expect(onSync).toHaveBeenCalledTimes(1)

    const state = handle.getPresence()
    expect(state).toHaveLength(1)
    expect(state[0]).toMatchObject({
      userId: profile.id,
      isSelf: true,
    })
  })

  it("reflects other sessions joining and leaving", () => {
    const channel = new MockRealtimeChannel()
    const client = createMockClient(channel)
    const onSync = vi.fn()

    const handle = createPresenceChannel(client, {
      entity,
      profile,
      throttleMs: 0,
      onSync,
    })

    onSync.mockClear()

    const remotePresence: PresenceMetadata = {
      sessionId: "session-remote",
      entity,
      userId: "resident-jordan",
      displayName: "Jordan Lee",
      avatarUrl: null,
      accentColor: "#f97316",
      cursor: { x: 24, y: 48, updatedAt: Date.now() },
      lastActiveAt: Date.now(),
    }

    channel.addExternalPresence(remotePresence.userId, remotePresence)

    expect(onSync).toHaveBeenCalled()
    let state = handle.getPresence()
    expect(state).toHaveLength(2)
    const remoteEntry = state.find((entry) => entry.userId === remotePresence.userId)
    expect(remoteEntry?.isSelf).toBe(false)

    onSync.mockClear()
    channel.removeExternalPresence(remotePresence.userId, remotePresence.sessionId)

    state = handle.getPresence()
    expect(state).toHaveLength(1)
    expect(onSync).toHaveBeenCalledTimes(1)
  })

  it("cleans up subscriptions when unsubscribed", async () => {
    const channel = new MockRealtimeChannel()
    const client = createMockClient(channel)
    const onSync = vi.fn()

    const handle = createPresenceChannel(client, {
      entity,
      profile,
      throttleMs: 0,
      onSync,
    })

    onSync.mockClear()

    await handle.unsubscribe()

    expect(channel.untrackCalls).toBe(1)
    expect(channel.unsubscribeCalls).toBe(1)
    expect(handle.getPresence()).toEqual([])
    expect(onSync).toHaveBeenLastCalledWith([])
  })
})
