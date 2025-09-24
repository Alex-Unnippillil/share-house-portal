"use client"

import { useMemo, useState } from "react"

import type { PostReaction } from "@/app/messaging/loaders"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const QUICK_REACTIONS = ["👍", "✅", "🧽", "✨", "👏", "🙌", "📌", "🛠️", "🍕", "💡"]

type ReactionState = PostReaction & { active: boolean }

type ThreadPostReactionsProps = {
  postId: string
  initialReactions?: PostReaction[]
}

const buildReactionAriaLabel = (reaction: ReactionState) => {
  const voteLabel = reaction.count === 1 ? "vote" : "votes"
  const actionLabel = reaction.active ? "Remove" : "Add"

  return `${reaction.emoji} reaction with ${reaction.count} ${voteLabel}. ${actionLabel} your reaction`
}

export function ThreadPostReactions({ postId, initialReactions = [] }: ThreadPostReactionsProps) {
  const [reactions, setReactions] = useState<ReactionState[]>(() =>
    initialReactions.map((reaction) => ({
      ...reaction,
      active: Boolean(reaction.active),
    })),
  )
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const quickReactionPalette = useMemo(() => {
    return Array.from(new Set([...QUICK_REACTIONS, ...reactions.map((reaction) => reaction.emoji)]))
  }, [reactions])

  const toggleReaction = (emoji: string) => {
    setReactions((previous) => {
      const existingIndex = previous.findIndex((reaction) => reaction.emoji === emoji)

      if (existingIndex === -1) {
        return [...previous, { emoji, count: 1, active: true }]
      }

      const existing = previous[existingIndex]

      if (existing.active) {
        const nextCount = Math.max(existing.count - 1, 0)
        const nextReactions = previous.slice()

        if (nextCount === 0) {
          nextReactions.splice(existingIndex, 1)
          return nextReactions
        }

        nextReactions[existingIndex] = { ...existing, count: nextCount, active: false }
        return nextReactions
      }

      const nextReactions = previous.slice()
      nextReactions[existingIndex] = { ...existing, count: existing.count + 1, active: true }

      return nextReactions
    })
  }

  const handleAddReaction = (emoji: string) => {
    toggleReaction(emoji)
    setIsPickerOpen(false)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {reactions.map((reaction) => (
        <Button
          key={`${postId}-${reaction.emoji}`}
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={reaction.active}
          onClick={() => toggleReaction(reaction.emoji)}
          aria-label={buildReactionAriaLabel(reaction)}
          className={cn(
            "h-8 rounded-full border-dashed bg-background/60 px-3 text-xs",
            reaction.active && "border-primary text-primary",
          )}
        >
          <span className="mr-1 text-base" aria-hidden>
            {reaction.emoji}
          </span>
          {reaction.count}
        </Button>
      ))}

      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            + Add reaction
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] space-y-2 rounded-xl border border-border/60 bg-background/95 p-3 text-center shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="grid grid-cols-5 gap-1">
            {quickReactionPalette.map((emoji) => (
              <Button
                key={`${postId}-picker-${emoji}`}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleAddReaction(emoji)}
                className="size-9 rounded-lg text-lg"
                aria-label={`Add ${emoji} reaction`}
              >
                <span aria-hidden>{emoji}</span>
              </Button>
            ))}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            Tap to react. Tap again on a selected emoji to remove your reaction.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  )
}
