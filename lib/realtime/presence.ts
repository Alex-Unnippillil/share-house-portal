import type { RealtimeChannel } from "@supabase/supabase-js"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const PRESENCE_NAMESPACE = "presence"
const DEFAULT_THROTTLE_MS = 200

type PresenceState = Record<string, PresenceStatePayload[]>

type PresenceStatePayload = PresenceMetadata & {
  presence_ref?: string
}

export type PresenceEntity = {
  id: string
  type: string
}

export type PresenceProfile = {
  id: string
  displayName: string
  avatarUrl?: string | null
  accentColor?: string | null
}

export type PresenceCursor = {
  x: number
  y: number
  updatedAt: number
}

export type PresenceMetadata = {
  sessionId: string
  entity: PresenceEntity
  userId: string
  displayName: string
  avatarUrl?: string | null
  accentColor?: string | null
  cursor?: PresenceCursor
  lastActiveAt: number
}

export type PresenceParticipant = {
  sessionId: string
  userId: string
  displayName: string
  avatarUrl?: string | null
  accentColor?: string | null
  cursor?: PresenceCursor
  lastActiveAt: number
  isSelf: boolean
}

type PresenceUpdate = {
  displayName?: string
  avatarUrl?: string | null
  accentColor?: string | null
  cursor?: PresenceCursor | null
}

type PresenceChannelOptions = {
  entity: PresenceEntity
  profile: PresenceProfile
  throttleMs?: number
  onSync?: (participants: PresenceParticipant[]) => void
}

export type PresenceChannelHandle = {
  channel: RealtimeChannel
  sessionId: string
  getPresence: () => PresenceParticipant[]
  update: (patch: PresenceUpdate) => Promise<void>
  unsubscribe: () => Promise<void>
}

export function buildPresenceChannelName(entity: PresenceEntity) {
  return `${PRESENCE_NAMESPACE}:${entity.type}:${entity.id}`
}

export function createPresenceChannel(
  client: TypedSupabaseClient,
  options: PresenceChannelOptions,
): PresenceChannelHandle {
  const { entity, profile } = options
  const throttleMs = Math.max(0, options.throttleMs ?? DEFAULT_THROTTLE_MS)
  const sessionId = createSessionId()

  let cachedParticipants: PresenceParticipant[] = []
  let pendingParticipants: PresenceParticipant[] | null = null
  let lastEmit = 0
  let emitTimeout: ReturnType<typeof setTimeout> | null = null
  let hasJoined = false

  const channel = client.channel(buildPresenceChannelName(entity), {
    config: {
      presence: { key: profile.id },
    },
  })

  let currentMetadata: PresenceMetadata = {
    sessionId,
    entity,
    userId: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
    accentColor: profile.accentColor ?? null,
    lastActiveAt: Date.now(),
  }

  const cleanupHandlers: Array<() => void> = []

  const emitParticipants = (participants: PresenceParticipant[]) => {
    cachedParticipants = participants

    if (!options.onSync) {
      return
    }

    const now = Date.now()
    if (now - lastEmit >= throttleMs) {
      lastEmit = now
      options.onSync(participants)
      return
    }

    pendingParticipants = participants
    if (emitTimeout) {
      return
    }

    const delay = Math.max(throttleMs - (now - lastEmit), 0)
    emitTimeout = setTimeout(() => {
      emitTimeout = null
      lastEmit = Date.now()
      const payload = pendingParticipants ?? participants
      pendingParticipants = null
      options.onSync?.(payload)
    }, delay)
  }

  const handleSync = () => {
    const state = channel.presenceState<PresenceMetadata>() as PresenceState
    const participants = deriveParticipants(state, entity, sessionId)
    emitParticipants(participants)
  }

  channel.on("presence", { event: "sync" }, handleSync)

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      hasJoined = true
      await channel.track(currentMetadata)
    }
  })

  if (typeof window !== "undefined") {
    const handleBeforeUnload = () => {
      void channel.untrack()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    cleanupHandlers.push(() =>
      window.removeEventListener("beforeunload", handleBeforeUnload),
    )

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void channel.untrack()
      } else if (document.visibilityState === "visible" && hasJoined) {
        void channel.track(currentMetadata)
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    cleanupHandlers.push(() =>
      document.removeEventListener("visibilitychange", handleVisibility),
    )
  }

  const update = async (patch: PresenceUpdate) => {
    const nextMetadata: PresenceMetadata = {
      ...currentMetadata,
      lastActiveAt: Date.now(),
    }

    if (Object.prototype.hasOwnProperty.call(patch, "displayName")) {
      if (typeof patch.displayName === "string") {
        nextMetadata.displayName = patch.displayName
      }
    }

    if (Object.prototype.hasOwnProperty.call(patch, "avatarUrl")) {
      nextMetadata.avatarUrl = patch.avatarUrl ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, "accentColor")) {
      nextMetadata.accentColor = patch.accentColor ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, "cursor")) {
      nextMetadata.cursor = patch.cursor ?? undefined
    }

    currentMetadata = nextMetadata

    if (hasJoined) {
      await channel.update(nextMetadata)
    }
  }

  const getPresence = () => cachedParticipants

  const unsubscribe = async () => {
    cleanupHandlers.forEach((handler) => handler())
    cleanupHandlers.length = 0

    if (emitTimeout) {
      clearTimeout(emitTimeout)
      emitTimeout = null
      pendingParticipants = null
    }

    if (hasJoined) {
      await channel.untrack()
      hasJoined = false
    }

    await channel.unsubscribe()
    emitParticipants([])
  }

  return {
    channel,
    sessionId,
    getPresence,
    update,
    unsubscribe,
  }
}

function deriveParticipants(
  state: PresenceState,
  entity: PresenceEntity,
  sessionId: string,
): PresenceParticipant[] {
  const participants: PresenceParticipant[] = []

  for (const [userId, sessions] of Object.entries(state)) {
    for (const session of sessions) {
      if (!session.entity) {
        continue
      }

      if (session.entity.id !== entity.id || session.entity.type !== entity.type) {
        continue
      }

      const participant: PresenceParticipant = {
        sessionId:
          session.sessionId ?? session.presence_ref ?? `${userId}:${participants.length}`,
        userId,
        displayName: session.displayName ?? "Guest",
        avatarUrl: session.avatarUrl ?? null,
        accentColor: session.accentColor ?? null,
        cursor: session.cursor,
        lastActiveAt: session.lastActiveAt ?? 0,
        isSelf: session.sessionId === sessionId,
      }

      participants.push(participant)
    }
  }

  return participants.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
}

function createSessionId() {
  const globalCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID()
  }

  return `session_${Math.random().toString(36).slice(2, 10)}`
}
