'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AtSign, Hash, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import useSupabaseBrowser from '@/utils/supabase-browser'

import {
  findActiveMentionTrigger,
  insertMentionToken,
  pruneMissingMentions,
  type MentionTriggerState,
} from '@/lib/messaging/composer-utils'
import { getMentionSuggestions } from '@/lib/messaging/mentions'
import type {
  MentionSuggestion,
  MentionTrigger,
  StoredMention,
} from '@/lib/messaging/types'

interface MessageComposerProps {
  threadId: string
  currentUserId: string
  currentUserName: string
  unitId?: string | null
  onSubmit?: (payload: {
    content: string
    mentions: StoredMention[]
  }) => Promise<void> | void
}

type SuggestionState = {
  trigger: MentionTrigger
  items: MentionSuggestion[]
}

export function MessageComposer({
  threadId,
  currentUserId,
  currentUserName,
  unitId,
  onSubmit,
}: MessageComposerProps) {
  const supabase = useSupabaseBrowser()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<StoredMention[]>([])
  const [triggerState, setTriggerState] = useState<MentionTriggerState | null>(
    null,
  )
  const [suggestions, setSuggestions] = useState<SuggestionState | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const helperText = useMemo(
    () =>
      'Use @ to mention roommates and # to link documents or amenities. Mentions notify roommates unless they mute the thread.',
    [],
  )

  const resetSuggestions = useCallback(() => {
    setSuggestions(null)
    setActiveIndex(0)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      if (!triggerState) {
        resetSuggestions()
        return
      }

      setIsSearching(true)
      try {
        const items = await getMentionSuggestions(
          supabase,
          triggerState.trigger,
          triggerState.query,
          { unitId: unitId ?? undefined },
        )

        if (!cancelled) {
          setSuggestions({ trigger: triggerState.trigger, items })
          setActiveIndex(0)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load mention suggestions', error)
          resetSuggestions()
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }

    void loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [resetSuggestions, supabase, triggerState, unitId])

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value
      setValue(nextValue)
      setMentions(prev => pruneMissingMentions(nextValue, prev))

      const caret = event.target.selectionStart ?? nextValue.length
      setTriggerState(findActiveMentionTrigger(nextValue, caret))
    },
    [],
  )

  const applySuggestion = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!triggerState) {
        return
      }

      const result = insertMentionToken(value, triggerState, suggestion)
      setValue(result.value)

      setMentions(prev =>
        pruneMissingMentions(result.value, [
          ...prev,
          {
            entityId: suggestion.id,
            entityType: suggestion.entityType,
            trigger: suggestion.trigger,
            label: suggestion.label,
            order: prev.length,
            metadata: suggestion.metadata,
          },
        ]),
      )

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(result.caret, result.caret)
        }
      })

      setTriggerState(null)
      resetSuggestions()
    },
    [resetSuggestions, triggerState, value],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!suggestions || suggestions.items.length === 0) {
        if (event.key === 'Escape') {
          setTriggerState(null)
          resetSuggestions()
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex(current =>
          current + 1 >= suggestions.items.length ? 0 : current + 1,
        )
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex(current =>
          current - 1 < 0 ? suggestions.items.length - 1 : current - 1,
        )
        return
      }

      if (event.key === 'Enter') {
        if (triggerState) {
          event.preventDefault()
          const suggestion = suggestions.items[activeIndex]
          if (suggestion) {
            applySuggestion(suggestion)
          }
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setTriggerState(null)
        resetSuggestions()
      }
    },
    [activeIndex, applySuggestion, resetSuggestions, suggestions, triggerState],
  )

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        return
      }

      const normalizedMentions = pruneMissingMentions(trimmed, mentions)

      try {
        setIsSubmitting(true)
        await onSubmit?.({
          content: trimmed,
          mentions: normalizedMentions,
        })
        setValue('')
        setMentions([])
        setTriggerState(null)
        resetSuggestions()
      } catch (error) {
        console.error('Failed to submit message', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [mentions, onSubmit, resetSuggestions, value],
  )

  const activeTrigger = suggestions?.trigger

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4"
      data-author-id={currentUserId}
      data-thread-id={threadId}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">
          Share an update, {currentUserName.split(' ')[0] ?? 'roommate'}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <AtSign className="size-3" />
            Roommates
          </span>
          <span className="inline-flex items-center gap-1">
            <Hash className="size-3" />
            Docs & amenities
          </span>
        </div>
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Announce wins, assign chores, or drop quick reminders with @mentions and #links."
        disabled={isSubmitting}
        className="min-h-[120px]"
      />

      {mentions.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {mentions.map(mention => (
            <Badge
              key={`${mention.entityType}-${mention.entityId}-${mention.order}`}
              variant="outline"
              className="gap-1"
            >
              {mention.trigger}
              {mention.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {triggerState ? (
        <div className="rounded-md border border-border/60 bg-background shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
            <span>
              {activeTrigger === '@'
                ? 'Tag a roommate to send them a notification'
                : 'Link documents or amenities for quick reference'}
            </span>
            {isSearching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
          </div>
          {suggestions && suggestions.items.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {suggestions.items.map((item, index) => (
                <li key={`${item.entityType}-${item.id}`}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2 text-left text-sm',
                      index === activeIndex && 'bg-muted/40',
                    )}
                    onMouseDown={event => {
                      event.preventDefault()
                      applySuggestion(item)
                    }}
                  >
                    <span className="font-medium text-foreground">
                      {item.trigger}
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {triggerState.query
                ? 'No results match your search.'
                : 'Start typing to search roommates, documents, or amenities.'}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{helperText}</p>
        <Button type="submit" disabled={isSubmitting || value.trim().length === 0}>
          {isSubmitting ? 'Posting…' : 'Post update'}
        </Button>
      </div>
    </form>
  )
}
