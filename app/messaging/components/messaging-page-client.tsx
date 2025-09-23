"use client"

import { useMemo, useState } from "react"
import ModerationControls from "@/components/messaging/moderation-controls"
import { SearchBar } from "@/components/search/search-bar"
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
import type { SearchFacetCounts, SearchResult } from "@/lib/search/client"
import { cn } from "@/lib/utils"
import { Paperclip } from "lucide-react"

export type ThreadListItem = {
  id: string
  title: string
  category: string
  summary: string
  lastMessageAt: string
  unreadCount: number
  participants: number
  attachments: number
  activity: string
  reactions: string[]
  pinned?: boolean
}

export type Attachment = {
  id: string
  label: string
  description: string
  type: string
}

export type PollOption = {
  label: string
  votes: number
}

export type ThreadPoll = {
  question: string
  closesAt: string
  totalVotes: number
  options: PollOption[]
}

export type PostReaction = {
  emoji: string
  count: number
  active?: boolean
}

export type ThreadPost = {
  id: string
  author: {
    name: string
    role: string
    initials: string
    accent: string
  }
  timestamp: string
  content: string[]
  attachments?: Attachment[]
  poll?: ThreadPoll
  reactions?: PostReaction[]
}

export type AttachmentSummary = {
  id: string
  title: string
  thread: string
  updatedBy: string
  type: string
}

export type PollSnapshot = {
  id: string
  title: string
  thread: string
  closesAt: string
  leadingOption: string
  votes: number
  progress: number
}

export type MessagingThread = {
  title: string
  summary: string
  category: string
  owner: string
  participants: number
  updated: string
}

interface MessagingPageClientProps {
  threadFilters: Array<{ label: string; value: string | null }>
  threadList: ThreadListItem[]
  threadPosts: ThreadPost[]
  attachmentSummary: AttachmentSummary[]
  pollSnapshots: PollSnapshot[]
  activeThread: MessagingThread
}

const computeBaseCategoryCounts = (threads: ThreadListItem[]) => {
  const counts: Record<string, number> = {}
  for (const thread of threads) {
    counts[thread.category] = (counts[thread.category] ?? 0) + 1
  }
  return counts
}

export function MessagingPageClient({
  threadFilters,
  threadList,
  threadPosts,
  attachmentSummary,
  pollSnapshots,
  activeThread,
}: MessagingPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [facetCounts, setFacetCounts] = useState<SearchFacetCounts | null>(null)
  const [searchThreadIds, setSearchThreadIds] = useState<Set<string> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const baseCategoryCounts = useMemo(
    () => computeBaseCategoryCounts(threadList),
    [threadList]
  )

  const searchFilters = useMemo(
    () => (activeCategory ? { category: [activeCategory] } : {}),
    [activeCategory]
  )

  const handleSearchResults = (result: SearchResult) => {
    setFacetCounts(result.facets ?? null)
    setSearchQuery(result.query)

    const appliedFilterCount = Object.values(result.appliedFilters ?? {}).reduce(
      (count, values) => count + (values?.length ?? 0),
      0
    )

    if (result.query.trim().length === 0 && result.hits.length === 0 && appliedFilterCount === 0) {
      setSearchThreadIds(null)
      return
    }

    const threads = result.hits
      .filter((hit) => hit.type === "thread")
      .map((hit) => hit.id)

    setSearchThreadIds(new Set(threads))
  }

  const displayedThreads = useMemo(() => {
    const scoped = activeCategory
      ? threadList.filter((thread) => thread.category === activeCategory)
      : threadList

    if (!searchThreadIds) {
      return scoped
    }

    return scoped.filter((thread) => searchThreadIds.has(thread.id))
  }, [activeCategory, searchThreadIds, threadList])

  const categoryFacetCounts = facetCounts?.category ?? {}

  const getCategoryCount = (value: string | null) => {
    if (value === null) {
      if (searchThreadIds) {
        return searchThreadIds.size
      }
      const facetTotal = Object.values(categoryFacetCounts).reduce(
        (acc, count) => acc + count,
        0
      )
      return facetTotal || threadList.length
    }

    if (categoryFacetCounts[value]) {
      return categoryFacetCounts[value]
    }

    if (searchThreadIds) {
      return displayedThreads.filter((thread) => thread.category === value).length
    }

    return baseCategoryCounts[value] ?? 0
  }

  const noResults =
    searchQuery.trim().length > 0 &&
    searchThreadIds !== null &&
    (searchThreadIds?.size ?? 0) === 0

  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Messaging</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Organize roommate discussions by topic, capture reactions, and close the loop on decisions with polls and shared attachments.
          </p>
        </div>
        <Separator />
      </header>

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
              <SearchBar
                scope="messaging"
                placeholder="Search threads, polls, and attachments"
                activeFilters={searchFilters}
                limit={20}
                onResults={handleSearchResults}
                onQueryChange={setSearchQuery}
              />
              <div className="flex flex-wrap gap-2">
                {threadFilters.map((filter) => {
                  const isActive =
                    (filter.value === null && activeCategory === null) ||
                    (filter.value !== null && filter.value === activeCategory)

                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => setActiveCategory(filter.value)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
                        isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      <span>{filter.label}</span>
                      <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {getCategoryCount(filter.value)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {noResults ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No threads found for "{searchQuery}". Try refining your keywords or resetting the filters.
                </div>
              ) : (
                displayedThreads.map((thread) => (
                  <div
                    key={thread.id}
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
                ))
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
                {pollSnapshots.map((poll) => (
                  <div
                    key={poll.id}
                    className="space-y-3 rounded-lg border border-border/60 bg-background/80 p-4"
                  >
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>{activeThread.title}</CardTitle>
                  <CardDescription>{activeThread.summary}</CardDescription>
                </div>
                <Badge variant="secondary">{activeThread.category}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Owned by {activeThread.owner}</span>
                <span>{activeThread.participants} participants</span>
                <span>Updated {activeThread.updated}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {threadPosts.map((post, index) => (
                <div key={post.id} className="space-y-4">
                  <article className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar className={cn("size-10", post.author.accent)}>
                        <AvatarFallback>{post.author.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
                            <p className="text-xs text-muted-foreground">{post.author.role}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                        </div>
                        <div className="space-y-2 text-sm leading-relaxed text-foreground">
                          {post.content.map((paragraph, idx) => (
                            <p key={`${post.id}-paragraph-${idx}`}>{paragraph}</p>
                          ))}
                        </div>

                        {post.attachments?.length ? (
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
                                  reaction.active && "border-primary text-primary"
                                )}
                              >
                                <span className="mr-1 text-base" aria-hidden>
                                  {reaction.emoji}
                                </span>
                                {reaction.count}
                              </Button>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                            >
                              + Add reaction
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                  {index < threadPosts.length - 1 ? <Separator /> : null}
                </div>
              ))}
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
              {attachmentSummary.map((attachment) => (
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
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <ModerationControls />
    </div>
  )
}
