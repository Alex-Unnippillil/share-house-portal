"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  createPresenceChannel,
  type PresenceChannelHandle,
  type PresenceEntity,
  type PresenceParticipant,
  type PresenceProfile,
} from "@/lib/realtime/presence"
import useSupabaseBrowser from "@/utils/supabase-browser"

const MAX_DEFAULT_AVATARS = 3
const CURSOR_UPDATE_THROTTLE = 120
const CURSOR_STALE_MS = 6_000
const FALLBACK_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#f97316",
  "#a855f7",
  "#10b981",
  "#f43f5e",
]

type PresenceAvatarsProps = {
  entity: PresenceEntity
  currentUser: PresenceProfile
  className?: string
  showCursors?: boolean
  maxAvatars?: number
}

export default function PresenceAvatars({
  entity,
  currentUser,
  className,
  showCursors = true,
  maxAvatars = MAX_DEFAULT_AVATARS,
}: PresenceAvatarsProps) {
  const supabase = useSupabaseBrowser()
  const [participants, setParticipants] = useState<PresenceParticipant[]>([])
  const [presenceHandle, setPresenceHandle] = useState<PresenceChannelHandle | null>(null)

  const profile = useMemo(
    () => ({
      id: currentUser.id,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl ?? null,
      accentColor: currentUser.accentColor ?? null,
    }),
    [
      currentUser.id,
      currentUser.displayName,
      currentUser.avatarUrl,
      currentUser.accentColor,
    ],
  )

  const entityRef = useMemo(
    () => ({
      id: entity.id,
      type: entity.type,
    }),
    [entity.id, entity.type],
  )

  const handleSync = useCallback((state: PresenceParticipant[]) => {
    setParticipants(state)
  }, [])

  useEffect(() => {
    if (!profile.id || !entityRef.id || !entityRef.type) {
      return
    }

    const handle = createPresenceChannel(supabase, {
      entity: entityRef,
      profile,
      throttleMs: 180,
      onSync: handleSync,
    })

    setPresenceHandle(handle)

    return () => {
      void handle.unsubscribe()
    }
  }, [supabase, entityRef, profile, handleSync])

  useEffect(() => {
    if (!showCursors || !presenceHandle) {
      return
    }

    let lastSent = 0
    let pending: { x: number; y: number } | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    let isUnmounted = false

    const flush = () => {
      if (!pending || isUnmounted) {
        return
      }

      const payload = {
        cursor: {
          x: pending.x,
          y: pending.y,
          updatedAt: Date.now(),
        },
      } as const

      pending = null
      lastSent = Date.now()
      void presenceHandle.update(payload)
    }

    const handlePointerMove = (event: PointerEvent) => {
      pending = { x: event.clientX, y: event.clientY }
      const now = Date.now()
      const elapsed = now - lastSent
      if (elapsed >= CURSOR_UPDATE_THROTTLE) {
        flush()
      } else if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null
          flush()
        }, CURSOR_UPDATE_THROTTLE - elapsed)
      }
    }

    const clearCursor = () => {
      pending = null
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      void presenceHandle.update({ cursor: null })
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerleave", clearCursor)
    window.addEventListener("blur", clearCursor)

    return () => {
      isUnmounted = true
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerleave", clearCursor)
      window.removeEventListener("blur", clearCursor)
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [presenceHandle, showCursors])

  const uniqueParticipants = useMemo(() => {
    const latestByUser = new Map<string, PresenceParticipant>()

    for (const participant of participants) {
      const current = latestByUser.get(participant.userId)
      if (!current || participant.lastActiveAt > current.lastActiveAt) {
        latestByUser.set(participant.userId, participant)
      }
    }

    return Array.from(latestByUser.values()).sort(
      (a, b) => b.lastActiveAt - a.lastActiveAt,
    )
  }, [participants])

  const displayedParticipants = uniqueParticipants.slice(0, maxAvatars)
  const overflowCount = Math.max(uniqueParticipants.length - displayedParticipants.length, 0)
  const totalUsers = uniqueParticipants.length
  const statusLabel =
    totalUsers === 0
      ? "Connecting…"
      : totalUsers === 1
      ? "You’re here"
      : `${totalUsers} active`

  const now = Date.now()
  const activeCursors = showCursors
    ? participants.filter((participant) => {
        if (participant.isSelf || !participant.cursor) {
          return false
        }

        return now - participant.cursor.updatedAt < CURSOR_STALE_MS
      })
    : []

  const cursorLayer =
    showCursors && typeof document !== "undefined" && activeCursors.length > 0
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[70]">
            {activeCursors.map((participant) => {
              const color = getAccentColor(participant)
              const cursor = participant.cursor!
              return (
                <div
                  key={participant.sessionId}
                  className="pointer-events-none absolute"
                  style={{
                    transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
                  }}
                >
                  <div className="flex translate-x-3 -translate-y-3 items-center gap-1.5">
                    <span
                      className="block size-3 rotate-45 rounded-sm shadow"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="rounded-md bg-background/95 px-2 py-0.5 text-xs font-medium text-foreground shadow-lg ring-1 ring-border/70">
                      {participant.displayName}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div className={cn("flex items-center gap-3", className)} aria-live="polite">
        <div className="flex items-center -space-x-2">
          {displayedParticipants.length === 0 ? (
            <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-border bg-background text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              …
            </div>
          ) : null}
          {displayedParticipants.map((participant) => {
            const accent = getAccentColor(participant)
            const initials = getInitials(participant.displayName)
            return (
              <div key={participant.userId} className="relative inline-flex">
                <Avatar
                  className="size-8 border-2 border-background shadow-sm"
                  title={participant.isSelf ? "You" : participant.displayName}
                >
                  {participant.avatarUrl ? (
                    <AvatarImage src={participant.avatarUrl} alt={participant.displayName} />
                  ) : (
                    <AvatarFallback
                      className="text-[11px] font-semibold uppercase text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              </div>
            )
          })}
          {overflowCount > 0 ? (
            <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-border bg-background text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              +{overflowCount}
            </div>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className="border-dashed px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {statusLabel}
        </Badge>
        <span className="sr-only">{totalUsers} people currently viewing this surface</span>
      </div>
      {cursorLayer}
    </>
  )
}

function getAccentColor(participant: PresenceParticipant) {
  if (participant.accentColor) {
    return participant.accentColor
  }

  const index = Math.abs(hashString(participant.userId)) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[index]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return hash
}
