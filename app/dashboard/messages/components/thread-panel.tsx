"use client"

import { useMemo } from "react"
import { Building2, Lock, Pin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { canModerateThread } from "@/lib/messages/permissions"
import type { MessageEntity } from "@/lib/messages/state"

import { useMessagesContext } from "./messages-provider"
import MessageComposer from "./message-composer"
import MessageItem from "./message-item"

function computeDepth(messageId: string, messages: Record<string, MessageEntity>) {
  let depth = 0
  let current = messages[messageId]
  const visited = new Set<string>()

  while (current?.parent_message_id) {
    if (visited.has(current.parent_message_id)) {
      break
    }
    visited.add(current.parent_message_id)
    depth += 1
    current = messages[current.parent_message_id]
  }

  return depth
}

export default function ThreadPanel() {
  const {
    state,
    selectedThreadId,
    assignments,
    buildings,
    units,
  } = useMessagesContext()

  const entity = selectedThreadId ? state.threads[selectedThreadId] : undefined
  const canModerate = useMemo(() => {
    if (!entity) {
      return false
    }
    return canModerateThread(entity.thread, assignments)
  }, [entity, assignments])

  if (!entity) {
    return (
      <Card className="flex h-full flex-col items-center justify-center border-dashed bg-muted/30 text-center">
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a thread to get started or create a new conversation.
          </p>
        </CardContent>
      </Card>
    )
  }

  const thread = entity.thread
  const building = buildings.find((entry) => entry.id === thread.building_id)
  const unit = thread.unit_id ? units.find((entry) => entry.id === thread.unit_id) : undefined
  const pinnedMessage = thread.pinned_message_id
    ? entity.messages[thread.pinned_message_id]
    : undefined

  const messages = entity.messageOrder.map((id) => entity.messages[id])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-semibold">{thread.title}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden="true" />
                {building?.name ?? "Building"}
              </span>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {thread.category}
              </Badge>
              <span>{unit ? unit.label : "Common areas"}</span>
              {thread.is_locked ? (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  <Lock className="size-3" /> Locked
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>
      {pinnedMessage ? (
        <div className="border-b bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Pin className="size-3.5" aria-hidden="true" /> Pinned message
          </div>
          <MessageItem
            message={pinnedMessage}
            depth={0}
            threadId={thread.id}
            canModerate={canModerate}
            isPinned
          />
        </div>
      ) : null}
      <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              depth={computeDepth(message.id, entity.messages)}
              threadId={thread.id}
              canModerate={canModerate}
            />
          ))
        )}
      </CardContent>
      <Separator />
      <div className="p-4">
        <MessageComposer threadId={thread.id} isLocked={thread.is_locked} />
      </div>
    </Card>
  )
}
