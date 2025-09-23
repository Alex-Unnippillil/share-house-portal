"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
} from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import useThreadPresence from "@/hooks/use-thread-presence"
import { getReadableTextColor } from "@/lib/color"
import {
  type ThreadPresenceCursor,
  type ThreadPresenceUser,
} from "@/lib/messaging/thread-presence-manager"

const CONNECTION_COPY: Record<string, string> = {
  connected: "Synced with Supabase",
  connecting: "Connecting to Supabase…",
  error: "Connection lost — retrying",
  offline: "Offline",
}

type ReplyComposerProps = {
  threadId: string
}

export default function ReplyComposer({ threadId }: ReplyComposerProps) {
  const { users, status, viewer, setTyping, updateCursor } = useThreadPresence(threadId)
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const frameRef = useRef<number | null>(null)

  const remoteUsers = useMemo(
    () => users.filter((user) => !user.isSelf),
    [users],
  )

  const remoteCursors = useMemo(
    () => remoteUsers.filter((user) => user.cursor),
    [remoteUsers],
  )

  const typingUsers = useMemo(
    () => remoteUsers.filter((user) => user.typing),
    [remoteUsers],
  )

  const connectionMessage = CONNECTION_COPY[status] ?? CONNECTION_COPY.connecting

  const scheduleCursorBroadcast = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const textarea = textareaRef.current
      if (!textarea) {
        return
      }

      const { selectionStart, selectionEnd, value: draft } = textarea
      const prefix = draft.slice(0, selectionStart)
      const lineBreaks = prefix.split("\n").length - 1
      const lastBreak = prefix.lastIndexOf("\n")
      const column = lastBreak === -1 ? prefix.length : prefix.length - lastBreak - 1

      updateCursor({
        start: selectionStart,
        end: selectionEnd,
        line: lineBreaks,
        column,
        textLength: draft.length,
        timestamp: Date.now(),
      })
    })
  }, [updateCursor])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      updateCursor(null)
      setTyping(false)
    }
  }, [setTyping, updateCursor])

  const handleChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (event) => {
      setValue(event.target.value)
      setTyping(true)
      scheduleCursorBroadcast()
    },
    [scheduleCursorBroadcast, setTyping],
  )

  const handleFocus = useCallback(() => {
    setTyping(true)
    scheduleCursorBroadcast()
  }, [scheduleCursorBroadcast, setTyping])

  const handleBlur = useCallback(() => {
    setTyping(false)
    updateCursor(null)
  }, [setTyping, updateCursor])

  const handleSelectionChange = useCallback(() => {
    scheduleCursorBroadcast()
  }, [scheduleCursorBroadcast])

  const handleSend = useCallback(() => {
    setValue("")
    updateCursor(null)
    setTyping(false)
  }, [setTyping, updateCursor])

  const typingAnnouncement = formatTypingAnnouncement(typingUsers)

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Reply together
        </span>
        <span aria-live="polite">{connectionMessage}</span>
      </div>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSelect={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          placeholder="Share an update for the crew…"
          className="min-h-[140px] resize-y rounded-lg border-border/70 bg-background/80 text-sm leading-6"
        />
        <div className="pointer-events-none absolute inset-0">
          {remoteCursors.map((user) => (
            <RemoteCursor
              key={user.connectionId}
              name={user.name}
              color={user.color}
              cursor={user.cursor!}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span aria-live="polite">{typingAnnouncement}</span>
        <div className="flex items-center gap-2">
          {viewer ? (
            <span className="hidden text-[11px] uppercase tracking-wide text-muted-foreground sm:inline">
              You are {viewer.name}
            </span>
          ) : null}
          <Button size="sm" className="px-4" onClick={handleSend} type="button">
            Send update
          </Button>
        </div>
      </div>
    </div>
  )
}

type RemoteCursorProps = {
  name: string
  color: string
  cursor: ThreadPresenceCursor
}

function RemoteCursor({ name, color, cursor }: RemoteCursorProps) {
  const left = cursorPositionToPercent(cursor)
  return (
    <div
      className="pointer-events-none absolute inset-y-2 flex flex-col items-center"
      style={{ left: `calc(${left}% - 8px)` }}
    >
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold shadow"
        style={{
          backgroundColor: color,
          color: getReadableTextColor(color),
        }}
      >
        {name}
      </span>
      <div
        className="mt-1 h-full w-0.5 rounded-full"
        style={{ backgroundColor: color, opacity: 0.85 }}
      />
    </div>
  )
}

function cursorPositionToPercent(cursor: Pick<ThreadPresenceCursor, "start" | "textLength">) {
  if (!cursor.textLength) {
    return 0
  }

  const ratio = cursor.start / cursor.textLength
  const clamped = Math.max(0, Math.min(1, ratio))
  return clamped * 100
}

function formatTypingAnnouncement(users: ThreadPresenceUser[]) {
  if (users.length === 0) {
    return ""
  }

  if (users.length === 1) {
    return `${users[0].name} is typing…`
  }

  if (users.length === 2) {
    return `${users[0].name} and ${users[1].name} are typing…`
  }

  return `${users[0].name}, ${users[1].name}, and ${users.length - 2} others are typing…`
}
