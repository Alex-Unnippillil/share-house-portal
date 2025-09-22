"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"

import { useRouter } from "next/navigation"

import { formatDistanceToNow } from "date-fns"
import { Loader2, Paperclip, Pin, PlusCircle } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { createThreadAction, postMessageAction } from "./actions"

export type ThreadAuthor = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export type ThreadAttachment = {
  id: string
  file_name: string
  file_size: number | null
  content_type: string | null
  signed_url: string | null
}

export type ThreadMessage = {
  id: string
  content: string
  created_at: string
  attachments: ThreadAttachment[]
  sender: ThreadAuthor
}

export type ThreadNode = {
  id: string
  title: string
  topic: string
  summary: string | null
  metadata: Record<string, unknown> | null
  is_pinned: boolean
  created_at: string
  parent_thread_id: string | null
  created_by: ThreadAuthor | null
  children: ThreadNode[]
}

type ThreadClientProps = {
  profile: ThreadAuthor
  threads: ThreadNode[]
  messagesByThread: Record<string, ThreadMessage[]>
}

type FeedbackState = { type: "error" | "success" | "info"; message: string }

const topicBadgePalette = [
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-indigo-100 text-indigo-800",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-800",
  "bg-purple-100 text-purple-800",
]

const formFieldClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return ""
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getTopicBadgeClass(topic: string) {
  if (!topic) {
    return topicBadgePalette[0]
  }

  const normalized = topic.toLowerCase()
  let hash = 0
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(index)
    hash |= 0
  }

  const paletteIndex = Math.abs(hash) % topicBadgePalette.length
  return topicBadgePalette[paletteIndex]
}

function flattenThreads(nodes: ThreadNode[]): ThreadNode[] {
  return nodes.flatMap((node) => [node, ...flattenThreads(node.children)])
}

function ThreadTree({
  threads,
  selectedId,
  onSelect,
  depth = 0,
}: {
  threads: ThreadNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  depth?: number
}) {
  return (
    <ul className={cn("space-y-3", depth > 0 && "border-l border-border pl-4")}> 
      {threads.map((thread) => (
        <li key={thread.id} className="space-y-2">
          <button
            type="button"
            onClick={() => onSelect(thread.id)}
            className={cn(
              "w-full rounded-md border p-3 text-left transition hover:border-primary/60 hover:bg-muted/50",
              selectedId === thread.id && "border-primary bg-primary/5",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("capitalize", getTopicBadgeClass(thread.topic))}>{thread.topic}</Badge>
              {thread.is_pinned ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Pin className="size-3" />
                  Pinned
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold leading-5">{thread.title}</p>
            {thread.summary ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{thread.summary}</p>
            ) : null}
            {Array.isArray(thread.metadata?.tags) && thread.metadata?.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(thread.metadata?.tags as unknown[]).map((tag) => (
                  <Badge key={String(tag)} variant="outline" className="text-xs">
                    {String(tag)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </button>
          {thread.children.length > 0 ? (
            <ThreadTree threads={thread.children} onSelect={onSelect} selectedId={selectedId} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export default function ThreadClient({ profile, threads, messagesByThread }: ThreadClientProps) {
  const router = useRouter()
  const flatThreads = useMemo(() => flattenThreads(threads), [threads])
  const initialThreadId = threads[0]?.id ?? null
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId)
  const [threadFeedback, setThreadFeedback] = useState<FeedbackState | null>(null)
  const [messageFeedback, setMessageFeedback] = useState<FeedbackState | null>(null)
  const [createThreadPending, startCreateThreadTransition] = useTransition()
  const [sendMessagePending, startSendMessageTransition] = useTransition()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].id)
    }
  }, [threads, selectedThreadId])

  useEffect(() => {
    if (selectedThreadId && !flatThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads[0]?.id ?? null)
    }
  }, [flatThreads, selectedThreadId, threads])

  const selectedThread = useMemo(
    () => flatThreads.find((thread) => thread.id === selectedThreadId) ?? null,
    [flatThreads, selectedThreadId],
  )

  const messages = useMemo(() => {
    if (!selectedThreadId) {
      return []
    }

    return messagesByThread[selectedThreadId] ?? []
  }, [messagesByThread, selectedThreadId])

  const handleSelectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId)
    setMessageFeedback(null)
  }, [])

  const handleCreateThread = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const formData = new FormData(form)
      setThreadFeedback(null)
      startCreateThreadTransition(async () => {
        const result = await createThreadAction(formData)
        if (result.status === "success") {
          form.reset()
          setThreadFeedback({ type: "success", message: "Thread created successfully." })
          router.refresh()
        } else {
          const message = result.message ?? "Unable to create thread."
          const type = result.status === "partial" ? "info" : "error"
          setThreadFeedback({ type, message })
        }
      })
    },
    [router],
  )

  const handleAttachmentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    setSelectedFiles(files)
  }, [])

  const handleSendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedThreadId) {
        setMessageFeedback({ type: "error", message: "Select a thread before posting." })
        return
      }

      const form = event.currentTarget
      const formData = new FormData(form)
      setMessageFeedback(null)
      startSendMessageTransition(async () => {
        const result = await postMessageAction(formData)
        if (result.status === "success") {
          form.reset()
          setSelectedFiles([])
          setMessageFeedback({ type: "success", message: "Message posted." })
          router.refresh()
        } else if (result.status === "partial") {
          form.reset()
          setSelectedFiles([])
          setMessageFeedback({ type: "info", message: result.message })
          router.refresh()
        } else {
          setMessageFeedback({ type: "error", message: result.message ?? "Unable to send message." })
        }
      })
    },
    [router, selectedThreadId],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-6">
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PlusCircle className="size-4" /> Start a new thread
              </CardTitle>
            <CardDescription>
              Group updates by topic so every roommate can find the conversations that matter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="thread-title">
                  Title
                </label>
                <Input id="thread-title" name="title" placeholder="e.g. Spring deep clean" required disabled={createThreadPending} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="thread-topic">
                  Topic
                </label>
                <Input id="thread-topic" name="topic" placeholder="Maintenance, bills, chores…" required disabled={createThreadPending} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="thread-summary">
                  Summary
                </label>
                <Textarea
                  id="thread-summary"
                  name="summary"
                  rows={3}
                  placeholder="Share context or desired outcome for this thread."
                  disabled={createThreadPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="thread-tags">
                  Tags
                </label>
                <Input
                  id="thread-tags"
                  name="tags"
                  placeholder="Comma-separated keywords"
                  disabled={createThreadPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="thread-priority">
                  Priority
                </label>
                <select
                  id="thread-priority"
                  name="priority"
                  className={formFieldClassName}
                  defaultValue=""
                  disabled={createThreadPending}
                >
                  <option value="">Normal</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="thread-parent">
                  Parent thread
                </label>
                <select
                  id="thread-parent"
                  name="parentThreadId"
                  className={formFieldClassName}
                  defaultValue=""
                  disabled={createThreadPending || flatThreads.length === 0}
                >
                  <option value="">No parent</option>
                  {flatThreads.map((thread) => (
                    <option key={thread.id} value={thread.id}>
                      {thread.title}
                    </option>
                  ))}
                </select>
              </div>
              {threadFeedback ? (
                <p
                  className={cn(
                    "text-sm",
                    threadFeedback.type === "success" && "text-emerald-600",
                    threadFeedback.type === "error" && "text-destructive",
                    threadFeedback.type === "info" && "text-amber-600",
                  )}
                >
                  {threadFeedback.message}
                </p>
              ) : null}
              <Button type="submit" disabled={createThreadPending} className="w-full">
                {createThreadPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create thread
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active threads</CardTitle>
            <CardDescription>Browse announcements, discussions, and nested follow-ups.</CardDescription>
          </CardHeader>
          <CardContent>
            {threads.length ? (
              <ThreadTree threads={threads} selectedId={selectedThreadId} onSelect={handleSelectThread} />
            ) : (
              <p className="text-sm text-muted-foreground">Start a conversation to bring your household together.</p>
            )}
          </CardContent>
        </Card>
      </aside>
      <section className="space-y-6">
        {selectedThread ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("capitalize", getTopicBadgeClass(selectedThread.topic))}>{selectedThread.topic}</Badge>
                  <span>{selectedThread.title}</span>
                </CardTitle>
                {selectedThread.summary ? (
                  <CardDescription>{selectedThread.summary}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Created {formatDistanceToNow(new Date(selectedThread.created_at), { addSuffix: true })}
                  </span>
                  {selectedThread.created_by ? (
                    <span>by {selectedThread.created_by.full_name ?? "Household member"}</span>
                  ) : null}
                  {typeof selectedThread.metadata?.priority === "string" ? (
                    <Badge variant="secondary" className="capitalize">
                      Priority: {String(selectedThread.metadata?.priority)}
                    </Badge>
                  ) : null}
                </div>
                {Array.isArray(selectedThread.metadata?.tags) && selectedThread.metadata?.tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {(selectedThread.metadata?.tags as unknown[]).map((tag) => (
                      <Badge key={String(tag)} variant="outline">
                        {String(tag)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Conversation</CardTitle>
              </CardHeader>
              <Separator />
              <ScrollArea className="h-[420px]">
                <CardContent className="space-y-4">
                  {messages.length ? (
                    messages.map((message) => (
                      <article key={message.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarImage src={message.sender.avatar_url ?? undefined} alt={message.sender.full_name ?? "Roommate"} />
                              <AvatarFallback>{(message.sender.full_name ?? profile.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{message.sender.full_name ?? "Household member"}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{message.content}</p>
                        {message.attachments.length ? (
                          <div className="mt-4 space-y-2">
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.signed_url ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "flex items-center gap-3 rounded-md border p-2 text-sm transition",
                                  attachment.signed_url ? "hover:border-primary/60 hover:text-primary" : "cursor-not-allowed opacity-70",
                                )}
                              >
                                <Paperclip className="size-4" />
                                <div>
                                  <p className="font-medium">{attachment.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBytes(attachment.file_size)}
                                    {attachment.content_type ? ` • ${attachment.content_type}` : ""}
                                  </p>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No messages yet. Be the first to share an update.</p>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Share an update</CardTitle>
                <CardDescription>Attach receipts, maintenance photos, or documents for roommates to review.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <input type="hidden" name="threadId" value={selectedThread.id} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="message-content">
                      Message
                    </label>
                    <Textarea
                      id="message-content"
                      name="content"
                      rows={4}
                      placeholder="Keep everyone aligned with context, next steps, and requests."
                      disabled={sendMessagePending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="message-attachments">
                      Attachments
                    </label>
                    <Input
                      id="message-attachments"
                      name="attachments"
                      type="file"
                      multiple
                      onChange={handleAttachmentChange}
                      disabled={sendMessagePending}
                    />
                    {selectedFiles.length ? (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {selectedFiles.map((file) => (
                          <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2">
                            <Paperclip className="size-3" />
                            <span>
                              {file.name} {formatBytes(file.size) ? `(${formatBytes(file.size)})` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {messageFeedback ? (
                    <p
                      className={cn(
                        "text-sm",
                        messageFeedback.type === "success" && "text-emerald-600",
                        messageFeedback.type === "error" && "text-destructive",
                        messageFeedback.type === "info" && "text-amber-600",
                      )}
                    >
                      {messageFeedback.message}
                    </p>
                  ) : null}
                  <Button type="submit" disabled={sendMessagePending}>
                    {sendMessagePending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Send message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex h-full min-h-[420px] flex-col items-center justify-center space-y-3 text-center">
            <div className="rounded-full bg-muted p-3">
              <PlusCircle className="size-6" />
            </div>
            <CardTitle className="text-xl">Create your first thread</CardTitle>
            <CardDescription className="max-w-sm">
              Start a discussion to coordinate chores, schedule maintenance, or share household announcements.
            </CardDescription>
          </Card>
        )}
      </section>
    </div>
  )
}
