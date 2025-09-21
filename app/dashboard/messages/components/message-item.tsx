"use client"

import { formatDistanceToNow } from "date-fns"
import { Flag } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { MessageEntity } from "@/lib/messages/state"
import { ensureMessageMetadata } from "@/lib/messages/state"
import type { PollOptionMeta } from "@/types/messages"
import { useMessagesContext } from "./messages-provider"
import ModerationMenu from "./moderation-menu"

const REACTION_PRESETS = ["👍", "❤️", "🎉"]

interface MessageItemProps {
  message: MessageEntity
  depth: number
  threadId: string
  canModerate: boolean
  isPinned?: boolean
}

function initialsFromName(name: string | null | undefined) {
  if (!name) {
    return "?"
  }

  const parts = name.split(" ")
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase()
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

function isPollOptionReaction(reactionType: string) {
  return reactionType.startsWith("poll:")
}

function getPollOptionId(reactionType: string) {
  return reactionType.replace(/^poll:/, "")
}

export default function MessageItem({
  message,
  depth,
  threadId,
  canModerate,
  isPinned,
}: MessageItemProps) {
  const { profile, toggleReaction, moderateMessage } = useMessagesContext()

  const metadata = ensureMessageMetadata(message.metadata)
  const pollMetadata = metadata.poll
  const emojiReactions = message.reactions.filter(
    (reaction) => !isPollOptionReaction(reaction.reaction_type),
  )
  const pollReactions = message.reactions.filter((reaction) =>
    isPollOptionReaction(reaction.reaction_type),
  )

  const groupedReactions = emojiReactions.reduce(
    (acc, reaction) => {
      const group = acc.get(reaction.reaction_type) ?? []
      group.push(reaction)
      acc.set(reaction.reaction_type, group)
      return acc
    },
    new Map<string, typeof emojiReactions>(),
  )

  const userReactions = new Set(
    emojiReactions
      .filter((reaction) => reaction.profile_id === profile.id)
      .map((reaction) => reaction.reaction_type),
  )

  const userPollVotes = new Set(
    pollReactions
      .filter((reaction) => reaction.profile_id === profile.id)
      .map((reaction) => getPollOptionId(reaction.reaction_type)),
  )

  const createdAt = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  })

  const author = message.created_by_profile
  const isDeleted = message.is_deleted
  const flagged = Boolean(metadata.flagged)

  const pollOptions: PollOptionMeta[] = pollMetadata?.options ?? []
  const pollTotalVotes = pollReactions.length

  const handleReaction = async (reactionType: string) => {
    await toggleReaction({ messageId: message.id, reactionType })
  }

  const handlePollVote = async (option: PollOptionMeta) => {
    await toggleReaction({
      messageId: message.id,
      reactionType: `poll:${option.id}`,
      metadata: { optionLabel: option.label },
    })
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-transparent bg-background p-3 transition hover:border-border",
        isPinned && "ring-1 ring-primary",
      )}
      style={{ marginLeft: depth ? depth * 16 : undefined }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9">
          <AvatarImage src={author?.avatar_url ?? undefined} alt={author?.full_name ?? ""} />
          <AvatarFallback>{initialsFromName(author?.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <header className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{author?.full_name ?? "Unknown"}</span>
            <span className="text-xs text-muted-foreground">{createdAt}</span>
            {isPinned ? <Badge variant="secondary">Pinned</Badge> : null}
            {flagged ? (
              <Badge variant="outline" className="gap-1 text-xs text-red-600 dark:text-red-400">
                <Flag className="size-3" /> Flagged
              </Badge>
            ) : null}
          </header>
          <div className="text-sm">
            {isDeleted ? (
              <p className="italic text-muted-foreground">This message was removed by a moderator.</p>
            ) : pollMetadata ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Poll</p>
                <div className="space-y-2">
                  {pollOptions.map((option) => {
                    const votes = pollReactions.filter(
                      (reaction) => getPollOptionId(reaction.reaction_type) === option.id,
                    )
                    const voteCount = votes.length
                    const percentage = pollTotalVotes
                      ? Math.round((voteCount / pollTotalVotes) * 100)
                      : 0
                    const isSelected = userPollVotes.has(option.id)

                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => handlePollVote(option)}
                        className={cn(
                          "w-full rounded-md border p-2 text-left text-sm transition",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {voteCount} vote{voteCount === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pollTotalVotes} total vote{pollTotalVotes === 1 ? "" : "s"}
                  {pollMetadata.allowMultiple ? " • Multiple selections allowed" : null}
                </p>
              </div>
            ) : (
              <p>{message.body}</p>
            )}
          </div>
          <footer className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              {Array.from(groupedReactions.entries()).map(([reactionType, reactions]) => {
                const isActive = userReactions.has(reactionType)
                return (
                  <Button
                    key={reactionType}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => handleReaction(reactionType)}
                  >
                    <span>{reactionType}</span>
                    <span>{reactions.length}</span>
                  </Button>
                )
              })}
              {REACTION_PRESETS.filter((preset) => !groupedReactions.has(preset)).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => handleReaction(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            {canModerate ? (
              <ModerationMenu
                messageId={message.id}
                threadId={threadId}
                isDeleted={isDeleted}
                isPinned={Boolean(isPinned)}
                flagged={flagged}
                onModerate={moderateMessage}
              />
            ) : null}
          </footer>
        </div>
      </div>
    </article>
  )
}
