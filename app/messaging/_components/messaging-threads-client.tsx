"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { createBrowserClient } from "@supabase/ssr"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { Paperclip } from "lucide-react"

import ModerationControls from "@/components/messaging/moderation-controls"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Database, Tables } from "@/lib/supabase"

import {
  buildAttachmentSummary,
  buildPollSnapshots,
  buildThreadFilters,
  formatRelativeTime,
  mapMessageRowToPost,
  mapThreadRowToActive,
  mapThreadRowToList,
  sortPostsByCreatedAt,
  type MessagingThreadData,
  type ThreadListItem,
} from "../types"

type MessagingThreadsClientProps = {
  initialData: MessagingThreadData
}

export function MessagingThreadsClient({ initialData }: MessagingThreadsClientProps) {
  const [data, setData] = useState(initialData)

  const supabase = useMemo(
    () =>
      createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      ),
    [],
  )

  const handleThreadChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Tables<"threads">>) => {
      const newRow = (payload.new ?? null) as Tables<"threads"> | null
      const oldRow = (payload.old ?? null) as Tables<"threads"> | null

      setData((previous) => {
        let nextThreadList = previous.threadList
        let nextActiveThread = previous.activeThread
        let nextThreadPosts = previous.threadPosts
        let nextAttachmentSummary = previous.attachmentSummary
        let nextPollSnapshots = previous.pollSnapshots

        if (payload.eventType === "DELETE" && oldRow) {
          nextThreadList = previous.threadList.filter((thread) => thread.id !== oldRow.id)

          if (previous.activeThread?.id === oldRow.id) {
            nextActiveThread = null
            nextThreadPosts = []
            nextAttachmentSummary = []
            nextPollSnapshots = []
          }

          return {
            ...previous,
            threadList: nextThreadList,
            threadFilters: buildThreadFilters(nextThreadList),
            activeThread: nextActiveThread,
            threadPosts: nextThreadPosts,
            attachmentSummary: nextAttachmentSummary,
            pollSnapshots: nextPollSnapshots,
          }
        }

        if (!newRow) {
          return previous
        }

        const mapped = mapThreadRowToList(newRow)
        const existingIndex = previous.threadList.findIndex((thread) => thread.id === mapped.id)

        if (existingIndex >= 0) {
          nextThreadList = previous.threadList.map((thread) =>
            thread.id === mapped.id ? mapped : thread,
          )
        } else {
          nextThreadList = [mapped, ...previous.threadList]
        }

        if (previous.activeThread?.id === newRow.id) {
          nextActiveThread = mapThreadRowToActive(newRow)
          nextAttachmentSummary = buildAttachmentSummary(nextThreadPosts, nextActiveThread)
          nextPollSnapshots = buildPollSnapshots(nextThreadPosts, nextActiveThread)
        } else if (!previous.activeThread) {
          nextActiveThread = mapThreadRowToActive(newRow)
        }

        return {
          ...previous,
          threadList: nextThreadList,
          threadFilters: buildThreadFilters(nextThreadList),
          activeThread: nextActiveThread,
          attachmentSummary: nextAttachmentSummary,
          pollSnapshots: nextPollSnapshots,
        }
      })
    },
    [],
  )

  const handleMessageChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Tables<"messages">>) => {
      const newRow = (payload.new ?? null) as Tables<"messages"> | null
      const oldRow = (payload.old ?? null) as Tables<"messages"> | null

      if (payload.eventType === "INSERT" && newRow) {
        const mappedPost = mapMessageRowToPost(newRow)

        setData((previous) => {
          const updatedThreadList = updateThreadListLastMessage(previous.threadList, mappedPost.threadId, newRow.created_at)

          if (previous.activeThread?.id !== mappedPost.threadId) {
            return {
              ...previous,
              threadList: updatedThreadList,
              threadFilters: buildThreadFilters(updatedThreadList),
            }
          }

          const nextPosts = sortPostsByCreatedAt([...previous.threadPosts, mappedPost])
          const nextActiveThread = previous.activeThread
            ? { ...previous.activeThread, updated: formatRelativeTime(newRow.created_at) }
            : previous.activeThread

          return {
            ...previous,
            threadList: updatedThreadList,
            threadFilters: buildThreadFilters(updatedThreadList),
            threadPosts: nextPosts,
            activeThread: nextActiveThread,
            attachmentSummary: buildAttachmentSummary(nextPosts, nextActiveThread ?? null),
            pollSnapshots: buildPollSnapshots(nextPosts, nextActiveThread ?? null),
          }
        })
      }

      if (payload.eventType === "UPDATE" && newRow) {
        const mappedPost = mapMessageRowToPost(newRow)

        setData((previous) => {
          if (previous.activeThread?.id !== mappedPost.threadId) {
            return previous
          }

          const nextPosts = sortPostsByCreatedAt(
            previous.threadPosts.map((post) => (post.id === mappedPost.id ? mappedPost : post)),
          )

          return {
            ...previous,
            threadPosts: nextPosts,
            attachmentSummary: buildAttachmentSummary(nextPosts, previous.activeThread),
            pollSnapshots: buildPollSnapshots(nextPosts, previous.activeThread),
          }
        })
      }

      if (payload.eventType === "DELETE" && oldRow) {
        setData((previous) => {
          if (previous.activeThread?.id !== oldRow.thread_id) {
            return previous
          }

          const nextPosts = previous.threadPosts.filter((post) => post.id !== oldRow.id)

          return {
            ...previous,
            threadPosts: nextPosts,
            attachmentSummary: buildAttachmentSummary(nextPosts, previous.activeThread),
            pollSnapshots: buildPollSnapshots(nextPosts, previous.activeThread),
          }
        })
      }
    },
    [],
  )

  useEffect(() => {
    const threadsChannel = supabase
      .channel("threads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "threads" },
        handleThreadChange,
      )
      .subscribe()

    const messagesChannel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        handleMessageChange,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(threadsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [handleMessageChange, handleThreadChange, supabase])

  const { threadFilters, threadList, activeThread, threadPosts, attachmentSummary, pollSnapshots } = data

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[320px,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Threaded conversations</CardTitle>
                  <CardDescription>
                    Keep every roommate topic in its own thread so updates, reactions, and attachments stay in context.
                  </CardDescription>
                </div>
                <Button size="sm">New thread</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {threadFilters.map((filter) => (
                  <span
                    key={filter.label}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                      filter.active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {filter.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {threadList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No threads yet. Start the first conversation.</p>
              ) : (
                threadList.map((thread) => <ThreadListCard key={thread.id} thread={thread} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polls & alignment</CardTitle>
              <CardDescription>
                Track decisions across threads so chores, logistics, and maintenance stay in sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {pollSnapshots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active polls in this thread yet.</p>
                ) : (
                  pollSnapshots.map((poll) => <PollSnapshotCard key={poll.id} poll={poll} />)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>{activeThread?.title ?? "Select a thread"}</CardTitle>
                  <CardDescription>
                    {activeThread?.summary ?? "Choose a thread to review the latest roommate updates."}
                  </CardDescription>
                </div>
                {activeThread ? <Badge variant="secondary">{activeThread.category}</Badge> : null}
              </div>
              {activeThread ? (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Owner: {activeThread.owner}</span>
                  <span>{activeThread.participants} roommates involved</span>
                  <span>Updated {activeThread.updated}</span>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-8">
              {threadPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {activeThread
                    ? "No posts yet — be the first to share an update."
                    : "Pick a thread to load its conversation."}
                </p>
              ) : (
                threadPosts.map((post, index) => (
                  <div key={post.id} className="space-y-4">
                    <article className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className={cn("text-sm font-medium", post.author.accent)}>
                            {post.author.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{post.author.name}</span>
                            <Badge variant="outline">{post.author.role}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm leading-6 text-foreground">
                        {post.content.map((paragraph, idx) => (
                          <p key={`${post.id}-content-${idx}`} className="text-muted-foreground">
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {post.attachments?.length ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Attachments
                          </p>
                          <div className="space-y-2">
                            {post.attachments.map((attachment) => (
                              <div
                                key={`${post.id}-${attachment.id}`}
                                className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2"
                              >
                                <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                                <div className="flex flex-1 flex-col">
                                  <span className="text-sm font-medium text-foreground">{attachment.label}</span>
                                  <span className="text-xs text-muted-foreground">{attachment.description}</span>
                                </div>
                                <Badge variant="outline" className="whitespace-nowrap">
                                  {attachment.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {post.poll ? (
                        <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{post.poll.question}</p>
                              <p className="text-xs text-muted-foreground">Vote once to lock in the weekend.</p>
                            </div>
                            <Badge variant="secondary">Closes {post.poll.closesAt}</Badge>
                          </div>
                          <div className="space-y-3">
                            {post.poll.options.map((option) => {
                              const percent =
                                post.poll && post.poll.totalVotes > 0
                                  ? Math.round((option.votes / post.poll.totalVotes) * 100)
                                  : 0

                              return (
                                <div key={`${post.id}-${option.label}`} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                    <span>{option.label}</span>
                                    <span>
                                      {option.votes} vote{option.votes === 1 ? "" : "s"} · {percent}%
                                    </span>
                                  </div>
                                  <Progress value={percent} />
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {post.poll.totalVotes} roommate votes collected so far
                          </p>
                        </div>
                      ) : null}

                      {post.reactions?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {post.reactions.map((reaction) => (
                            <Button
                              key={`${post.id}-${reaction.emoji}`}
                              variant="outline"
                              size="sm"
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
                          <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs text-muted-foreground">
                            + Add reaction
                          </Button>
                        </div>
                      ) : null}
                    </article>
                    {index < threadPosts.length - 1 ? <Separator /> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared attachments</CardTitle>
              <CardDescription>
                Surface the latest files pinned across threads so everyone can reference the source of truth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachmentSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments posted yet.</p>
              ) : (
                attachmentSummary.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                  >
                    <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">{attachment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.thread} • {attachment.updatedBy}
                      </p>
                    </div>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {attachment.type}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ModerationControls />
    </>
  )
}

type ThreadListCardProps = {
  thread: ThreadListItem
}

function ThreadListCard({ thread }: ThreadListCardProps) {
  return (
    <div
      className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 transition hover:border-primary/50 hover:bg-background"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{thread.category}</Badge>
            {thread.pinned ? (
              <Badge variant="outline" className="uppercase">
                Pinned
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-foreground">{thread.title}</p>
          <p className="text-xs text-muted-foreground">{thread.summary}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs">
          <span className="text-muted-foreground">{thread.lastMessageAt}</span>
          {thread.unreadCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
              {thread.unreadCount} new
            </span>
          ) : null}
          <div className="flex gap-1">
            {thread.reactions.map((reaction) => (
              <span
                key={`${thread.id}-${reaction}`}
                className="inline-flex size-6 items-center justify-center rounded-full bg-background text-sm"
                aria-hidden
              >
                {reaction}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{thread.participants} participants</span>
        <span>{thread.attachments} attachments</span>
        <span>{thread.activity}</span>
      </div>
    </div>
  )
}

type PollSnapshotCardProps = {
  poll: MessagingThreadData["pollSnapshots"][number]
}

function PollSnapshotCard({ poll }: PollSnapshotCardProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{poll.title}</p>
          <p className="text-xs text-muted-foreground">{poll.thread}</p>
        </div>
        <Badge variant="secondary">{poll.closesAt}</Badge>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{poll.leadingOption}</span>
          <span>{poll.votes} votes</span>
        </div>
        <Progress value={poll.progress} />
      </div>
    </div>
  )
}

function updateThreadListLastMessage(
  threadList: ThreadListItem[],
  threadId: string,
  createdAt: string,
): ThreadListItem[] {
  const nextLastMessage = formatRelativeTime(createdAt)

  return threadList.map((thread) =>
    thread.id === threadId
      ? {
          ...thread,
          lastMessageAt: nextLastMessage,
        }
      : thread,
  )
}

