"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useLocalStorage } from "@/lib/hooks/use-local-storage"
import {
  ThreadPresenceManager,
  type ThreadPresenceCursor,
  type ThreadPresenceIdentity,
  type ThreadPresenceState,
} from "@/lib/messaging/thread-presence-manager"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type UseThreadPresenceState = ThreadPresenceState & {
  viewer: ThreadPresenceIdentity | null
  setTyping: (typing: boolean) => void
  updateCursor: (cursor: ThreadPresenceCursor | null) => void
}

const PRESENCE_IDENTITY_STORAGE_KEY = "share-house-portal.presence.identity"

const COLOR_POOL = [
  "#0ea5e9",
  "#f97316",
  "#6366f1",
  "#22c55e",
  "#ec4899",
  "#14b8a6",
  "#facc15",
]

const ADJECTIVES = [
  "Bright",
  "Calm",
  "Cozy",
  "Friendly",
  "Lively",
  "Mindful",
  "Organized",
  "Thoughtful",
]

const NOUNS = [
  "Alpaca",
  "Fox",
  "Heron",
  "Juniper",
  "Maple",
  "Otter",
  "Pine",
  "River",
]

const INITIAL_HOOK_STATE: ThreadPresenceState = {
  status: "offline",
  users: [],
  lastSyncedAt: null,
}

const managers = new Map<string, ThreadPresenceManager>()

function generateRandomIdentity(): ThreadPresenceIdentity {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const name = `${adjective} ${noun}`
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((segment) => segment.charAt(0))
    .join("")
    .toUpperCase()

  const color = COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]
  const id = globalThis.crypto?.randomUUID()
    ?? Math.random().toString(36).slice(2)

  return {
    id,
    name,
    initials,
    color,
  }
}

function getManagerKey(threadId: string) {
  return threadId
}

function getOrCreateManager(
  threadId: string,
  client: TypedSupabaseClient,
  identity: ThreadPresenceIdentity,
) {
  const key = getManagerKey(threadId)
  const existing = managers.get(key)

  if (existing) {
    return existing
  }

  const manager = new ThreadPresenceManager({
    client,
    threadId,
    identity,
  })

  managers.set(key, manager)
  return manager
}

function usePresenceIdentity() {
  const [identity, setIdentity] = useLocalStorage<ThreadPresenceIdentity | null>(
    PRESENCE_IDENTITY_STORAGE_KEY,
    null,
  )

  useEffect(() => {
    if (identity) {
      return
    }

    const nextIdentity = generateRandomIdentity()
    setIdentity(nextIdentity)
  }, [identity, setIdentity])

  return identity
}

export default function useThreadPresence(threadId: string): UseThreadPresenceState {
  const supabase = useSupabaseBrowser()
  const viewerIdentity = usePresenceIdentity()
  const managerRef = useRef<ThreadPresenceManager | null>(null)
  const [state, setState] = useState<ThreadPresenceState>(INITIAL_HOOK_STATE)

  useEffect(() => {
    if (!viewerIdentity) {
      return
    }

    const manager = getOrCreateManager(threadId, supabase, viewerIdentity)
    managerRef.current = manager
    setState(manager.snapshot)

    const unsubscribe = manager.subscribe(setState)

    return () => {
      unsubscribe()
      if (manager.snapshot.status === "offline") {
        managers.delete(getManagerKey(threadId))
      }
      managerRef.current = null
    }
  }, [supabase, threadId, viewerIdentity])

  const setTyping = useCallback((typing: boolean) => {
    managerRef.current?.setTyping(typing)
  }, [])

  const updateCursor = useCallback((cursor: ThreadPresenceCursor | null) => {
    managerRef.current?.updateCursor(cursor)
  }, [])

  return useMemo(() => {
    const status = viewerIdentity ? state.status : "connecting"

    return {
      ...state,
      status,
      viewer: viewerIdentity,
      setTyping: viewerIdentity ? setTyping : noop,
      updateCursor: viewerIdentity ? updateCursor : noop,
    }
  }, [state, viewerIdentity, setTyping, updateCursor])
}

function noop() {}
