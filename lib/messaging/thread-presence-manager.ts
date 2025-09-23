import type {
  RealtimeChannel,
  RealtimeChannelStatus,
  RealtimePresenceState,
} from "@supabase/supabase-js"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type PresenceListener = (state: ThreadPresenceState) => void

export type ThreadPresenceIdentity = {
  id: string
  name: string
  initials: string
  color: string
}

export type ThreadPresenceCursor = {
  start: number
  end: number
  line: number
  column: number
  textLength: number
  timestamp: number
}

export type ThreadPresenceUser = ThreadPresenceIdentity & {
  connectionId: string
  typing: boolean
  cursor: ThreadPresenceCursor | null
  lastActiveAt: number
  isSelf: boolean
}

export type ThreadPresenceConnectionStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "error"

export type ThreadPresenceState = {
  status: ThreadPresenceConnectionStatus
  users: ThreadPresenceUser[]
  lastSyncedAt: number | null
}

type PresencePayload = {
  identity: ThreadPresenceIdentity
  typing: boolean
  cursor: ThreadPresenceCursor | null
  lastActiveAt: number
  sessionId: string
}

type PresenceEnvelope = PresencePayload & {
  presence_ref?: string
}

const INITIAL_STATE: ThreadPresenceState = {
  status: "offline",
  users: [],
  lastSyncedAt: null,
}

function sortPresenceUsers(users: ThreadPresenceUser[]): ThreadPresenceUser[] {
  return [...users].sort((a, b) => {
    if (a.isSelf && !b.isSelf) {
      return -1
    }
    if (!a.isSelf && b.isSelf) {
      return 1
    }
    return a.name.localeCompare(b.name)
  })
}

export function derivePresenceUsers(
  presence: RealtimePresenceState<PresenceEnvelope>,
  viewerId: string,
  sessionId: string,
): ThreadPresenceUser[] {
  const collected: ThreadPresenceUser[] = []

  for (const entries of Object.values(presence)) {
    for (const entry of entries) {
      if (!entry.identity) {
        continue
      }

      const lastActiveAt = typeof entry.lastActiveAt === "number"
        ? entry.lastActiveAt
        : Date.now()

      collected.push({
        connectionId: entry.presence_ref ?? `${entry.identity.id}-${entry.sessionId}`,
        ...entry.identity,
        typing: Boolean(entry.typing),
        cursor: entry.cursor ?? null,
        lastActiveAt,
        isSelf: entry.identity.id === viewerId && entry.sessionId === sessionId,
      })
    }
  }

  return sortPresenceUsers(collected)
}

export class ThreadPresenceManager {
  private channel: RealtimeChannel | null = null
  private state: ThreadPresenceState = INITIAL_STATE
  private presencePayload: PresencePayload | null = null
  private readonly listeners = new Set<PresenceListener>()
  private readonly sessionId: string

  constructor(
    private readonly options: {
      client: TypedSupabaseClient
      threadId: string
      identity: ThreadPresenceIdentity
    },
  ) {
    this.sessionId = globalThis.crypto?.randomUUID()
      ?? Math.random().toString(36).slice(2)
  }

  get snapshot(): ThreadPresenceState {
    return this.state
  }

  subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    void this.connect()

    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        void this.disconnect()
      }
    }
  }

  setTyping(typing: boolean) {
    this.updatePresence({ typing })
  }

  updateCursor(cursor: ThreadPresenceCursor | null) {
    this.updatePresence({ cursor })
  }

  async disconnect() {
    if (!this.channel) {
      return
    }

    try {
      await this.channel.unsubscribe()
    } catch (error) {
      console.error("Failed to unsubscribe from thread presence", error)
    }

    this.channel = null
    this.state = {
      ...INITIAL_STATE,
      status: "offline",
    }
    this.notify()
  }

  private async connect() {
    if (this.channel || this.listeners.size === 0) {
      return
    }

    this.state = {
      ...this.state,
      status: "connecting",
    }
    this.notify()

    const { client, threadId, identity } = this.options

    try {
      const channel = client.channel(`thread-presence:${threadId}`, {
        config: {
          presence: {
            key: identity.id,
          },
        },
      })

      this.channel = channel

      channel
        .on("presence", { event: "sync" }, () => this.handlePresenceSync())
        .on("presence", { event: "join" }, () => this.handlePresenceSync())
        .on("presence", { event: "leave" }, () => this.handlePresenceSync())

      const payload = this.ensurePresencePayload()

      await channel.subscribe(async (status) => {
        this.handleStatusChange(status)

        if (status === "SUBSCRIBED") {
          try {
            await channel.track(payload)
            this.handlePresenceSync()
          } catch (error) {
            console.error("Failed to announce thread presence", error)
          }
        }
      })
    } catch (error) {
      console.error("Failed to connect to Supabase presence", error)
      this.state = {
        ...this.state,
        status: "error",
      }
      this.notify()
    }
  }

  private ensurePresencePayload(): PresencePayload {
    if (this.presencePayload) {
      return this.presencePayload
    }

    const payload: PresencePayload = {
      identity: this.options.identity,
      typing: false,
      cursor: null,
      lastActiveAt: Date.now(),
      sessionId: this.sessionId,
    }

    this.presencePayload = payload
    return payload
  }

  private handlePresenceSync() {
    if (!this.channel) {
      return
    }

    const presenceState = this.channel.presenceState<PresenceEnvelope>()
    const users = derivePresenceUsers(
      presenceState,
      this.options.identity.id,
      this.sessionId,
    )

    this.state = {
      ...this.state,
      users,
      lastSyncedAt: Date.now(),
    }

    this.notify()
  }

  private handleStatusChange(status: RealtimeChannelStatus) {
    if (status === "SUBSCRIBED") {
      this.state = {
        ...this.state,
        status: "connected",
      }
      this.notify()
      return
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      this.state = {
        ...this.state,
        status: "error",
        users: [],
      }
      this.notify()
      return
    }

    if (status === "CLOSED") {
      this.state = {
        ...this.state,
        status: "offline",
        users: [],
      }
      this.notify()
    }
  }

  private updatePresence(partial: Partial<PresencePayload>) {
    const base = this.ensurePresencePayload()
    const next: PresencePayload = {
      ...base,
      ...partial,
      lastActiveAt: Date.now(),
    }

    if (this.presencePayload && isPresenceEqual(this.presencePayload, next)) {
      return
    }

    this.presencePayload = next

    if (this.channel) {
      void this.channel.track(next)
    }

    this.state = {
      ...this.state,
      users: this.mergeSelfIntoUsers(next),
      lastSyncedAt: Date.now(),
    }
    this.notify()
  }

  private mergeSelfIntoUsers(payload: PresencePayload): ThreadPresenceUser[] {
    const others = this.state.users.filter((user) => !user.isSelf)

    const selfUser: ThreadPresenceUser = {
      connectionId: `${payload.identity.id}-${payload.sessionId}`,
      ...payload.identity,
      typing: payload.typing,
      cursor: payload.cursor,
      lastActiveAt: payload.lastActiveAt,
      isSelf: true,
    }

    return sortPresenceUsers([...others, selfUser])
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}

function isPresenceEqual(a: PresencePayload, b: PresencePayload) {
  return (
    a.identity.id === b.identity.id &&
    a.typing === b.typing &&
    areCursorsEqual(a.cursor, b.cursor)
  )
}

function areCursorsEqual(
  a: ThreadPresenceCursor | null,
  b: ThreadPresenceCursor | null,
) {
  if (!a && !b) {
    return true
  }

  if (!a || !b) {
    return false
  }

  return (
    a.start === b.start &&
    a.end === b.end &&
    a.line === b.line &&
    a.column === b.column &&
    a.textLength === b.textLength
  )
}
