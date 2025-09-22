"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type FormEventHandler,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { MentionDirectoryEntry, MentionSuggestion, MentionsWorkerResponse } from "@/types/mentions"

const BASE_MENTION_DIRECTORY: MentionDirectoryEntry[] = [
  { id: "rm_avery", handle: "avery", name: "Avery Chen", role: "Roommate" },
  { id: "rm_jordan", handle: "jordan", name: "Jordan Blake", role: "Roommate" },
  { id: "rm_priya", handle: "priya", name: "Priya Desai", role: "Roommate" },
  { id: "rm_samir", handle: "samir", name: "Samir Patel", role: "Roommate" },
  { id: "rm_nia", handle: "nia", name: "Nia Robinson", role: "Roommate" },
  { id: "pm_morgan", handle: "morgan", name: "Morgan Ellis", role: "Property Manager" },
  { id: "pm_taylor", handle: "taylor", name: "Taylor Ortiz", role: "Property Manager" },
  { id: "vendor_clean", handle: "sparklecrew", name: "Sparkle Crew", role: "Cleaning Vendor" },
  { id: "vendor_hvac", handle: "delta-hvac", name: "Delta HVAC", role: "Maintenance Vendor" },
]

interface ActiveMentionState {
  raw: string
  normalized: string
  start: number
  end: number
}

const sanitizeText = (value: string) => value.replace(/[\u0000-\u001F\u007F<>]/g, "").trim()

const areActiveMentionsEqual = (
  first: ActiveMentionState | null,
  second: ActiveMentionState | null,
) => {
  if (first === second) {
    return true
  }

  if (!first || !second) {
    return false
  }

  return (
    first.start === second.start &&
    first.end === second.end &&
    first.normalized === second.normalized
  )
}

const extractMentionQuery = (value: string, caretIndex: number): ActiveMentionState | null => {
  if (caretIndex < 0) {
    return null
  }

  const textUpToCaret = value.slice(0, caretIndex)
  const atIndex = textUpToCaret.lastIndexOf("@")

  if (atIndex === -1) {
    return null
  }

  if (atIndex > 0) {
    const charBefore = textUpToCaret.charAt(atIndex - 1)

    if (charBefore && !/[\s([{]/.test(charBefore)) {
      return null
    }
  }

  const rawQuery = textUpToCaret.slice(atIndex + 1)

  if (/\s/.test(rawQuery)) {
    return null
  }

  const sanitizedQuery = rawQuery.replace(/[^a-zA-Z0-9._-]/g, "")

  return {
    raw: sanitizedQuery,
    normalized: sanitizedQuery.toLowerCase(),
    start: atIndex,
    end: caretIndex,
  }
}

export function MessageComposer() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const activeMentionRef = useRef<string>("")
  const hasActiveMentionRef = useRef(false)
  const requestIdRef = useRef(0)
  const textareaId = useId()
  const suggestionListId = `${textareaId}-mentions`

  const [messageValue, setMessageValue] = useState("")
  const [activeMention, setActiveMention] = useState<ActiveMentionState | null>(null)
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [lastLatency, setLastLatency] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const mentionDirectory = useMemo(
    () =>
      BASE_MENTION_DIRECTORY.map((entry) => ({
        id: entry.id,
        handle: sanitizeText(entry.handle),
        name: sanitizeText(entry.name),
        role: entry.role ? sanitizeText(entry.role) : undefined,
      })),
    [],
  )

  const updateMentionFromValue = useCallback((value: string, caretIndex: number) => {
    const nextMention = extractMentionQuery(value, caretIndex)

    setActiveMention((current) =>
      areActiveMentionsEqual(current, nextMention) ? current : nextMention,
    )
  }, [])

  useEffect(() => {
    activeMentionRef.current = activeMention?.normalized ?? ""
    hasActiveMentionRef.current = Boolean(activeMention)
  }, [activeMention])

  const handleWorkerMessage = useCallback(
    (event: MessageEvent<MentionsWorkerResponse>) => {
      const message = event.data

      if (message.type !== "results") {
        return
      }

      if (message.payload.id !== requestIdRef.current) {
        return
      }

      if (message.payload.query !== activeMentionRef.current) {
        return
      }

      if (!hasActiveMentionRef.current) {
        return
      }

      setIsSearching(false)
      setLastLatency(message.payload.duration)

      const sanitizedResults = message.payload.results.map((result) => ({
        ...result,
        handle: sanitizeText(result.handle),
        name: sanitizeText(result.name),
        role: result.role ? sanitizeText(result.role) : undefined,
      }))

      setSuggestions(sanitizedResults)
    },
    [],
  )

  useEffect(() => {
    const worker = new Worker(
      new URL("../../../workers/mentions.worker.ts", import.meta.url),
      { type: "module" },
    )

    workerRef.current = worker
    worker.addEventListener("message", handleWorkerMessage)
    worker.postMessage({ type: "init", payload: mentionDirectory })

    return () => {
      worker.removeEventListener("message", handleWorkerMessage)
      worker.terminate()
      workerRef.current = null
    }
  }, [handleWorkerMessage, mentionDirectory])

  useEffect(() => {
    if (!workerRef.current) {
      return
    }

    if (!activeMention) {
      setSuggestions([])
      setIsSearching(false)
      setLastLatency(null)
      return
    }

    const timer = window.setTimeout(() => {
      requestIdRef.current += 1
      setIsSearching(true)

      workerRef.current?.postMessage({
        type: "search",
        payload: {
          id: requestIdRef.current,
          query: activeMention.normalized,
        },
      })
    }, 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeMention])

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    const nextValue = event.target.value
    setMessageValue(nextValue)
    setStatusMessage(null)
    const caretIndex = event.target.selectionStart ?? nextValue.length
    updateMentionFromValue(nextValue, caretIndex)
  }

  const handleCursorUpdate = () => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const caretIndex = textarea.selectionStart ?? textarea.value.length
    updateMentionFromValue(textarea.value, caretIndex)
  }

  const handleSelectSuggestion = (suggestion: MentionSuggestion) => {
    const textarea = textareaRef.current
    const mention = activeMention

    if (!textarea || !mention) {
      return
    }

    const prefix = messageValue.slice(0, mention.start)
    const suffix = messageValue.slice(mention.end)
    const mentionToken = `@${suggestion.handle}`
    const requiresSeparator = suffix.length > 0 && !/^\s/.test(suffix)

    const nextValue = `${prefix}${mentionToken}${requiresSeparator ? " " : ""}${suffix}`
    const nextCursor = prefix.length + mentionToken.length + (requiresSeparator ? 1 : 0)

    setMessageValue(nextValue)
    setSuggestions([])
    setActiveMention(null)

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const trimmed = messageValue.trim()

    if (!trimmed) {
      return
    }

    setStatusMessage("Message sent to the household thread (simulated)")
    setMessageValue("")
    setSuggestions([])
    setActiveMention(null)
  }

  const latencyDisplay =
    lastLatency !== null && !isSearching && Boolean(activeMention)

  const showSuggestions =
    activeMention && (isSearching || suggestions.length > 0 || latencyDisplay)

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
      aria-labelledby={`${textareaId}-label`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label id={`${textareaId}-label`} htmlFor={textareaId}>
            Message roommates
          </Label>
          {latencyDisplay ? (
            <span className="text-xs text-muted-foreground">
              Lookup: {lastLatency.toFixed(2)} ms
            </span>
          ) : null}
        </div>
        <Textarea
          id={textareaId}
          ref={textareaRef}
          value={messageValue}
          placeholder="Share an update or @mention a roommate…"
          rows={4}
          onChange={handleChange}
          onClick={handleCursorUpdate}
          onKeyUp={handleCursorUpdate}
          onSelect={handleCursorUpdate}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? suggestionListId : undefined}
          aria-expanded={showSuggestions}
          aria-describedby={statusMessage ? `${textareaId}-status` : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Type “@” to quickly mention roommates, property managers, or vendors.
        </p>
      </div>

      {showSuggestions ? (
        <div
          id={suggestionListId}
          role="listbox"
          aria-label="Mention suggestions"
          className="divide-y rounded-lg border bg-background shadow-sm"
        >
          <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>
              {isSearching ? "Searching mentions…" : "Select a person to mention"}
            </span>
            {activeMention?.raw ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                @{activeMention.raw}
              </span>
            ) : null}
          </div>
          {suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <div key={suggestion.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                    "transition hover:bg-muted",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelectSuggestion(suggestion)
                  }}
                >
                  <div>
                    <div className="font-medium">@{suggestion.handle}</div>
                    <div className="text-xs text-muted-foreground">
                      {suggestion.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {suggestion.role ? (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {suggestion.role}
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round(suggestion.score)}
                    </span>
                  </div>
                </button>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No matches yet. Continue typing to refine your mention.
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {statusMessage ? (
          <p id={`${textareaId}-status`} className="text-xs text-muted-foreground">
            {statusMessage}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Suggestions are handled in a dedicated worker to keep typing responsive.
          </span>
        )}
        <Button type="submit" disabled={!messageValue.trim()}>
          Post update
        </Button>
      </div>
    </form>
  )
}
