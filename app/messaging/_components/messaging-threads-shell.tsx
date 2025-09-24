import ModerationControls from "@/components/messaging/moderation-controls"
import { ThreadPostReactions } from "@/components/messaging/thread-post-reactions"
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
import { Paperclip } from "lucide-react"

import { loadMessagingThreadData } from "../loaders"

export async function MessagingThreadsShell() {
  const { threadFilters, threadList, activeThread, threadPosts, attachmentSummary, pollSnapshots } =
    await loadMessagingThreadData()

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
              {threadList.map((thread) => (
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
              ))}
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
                <span>Owner: {activeThread.owner}</span>
                <span>{activeThread.participants} roommates involved</span>
                <span>Updated {activeThread.updated}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {threadPosts.map((post, index) => (
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

                    <ThreadPostReactions postId={post.id} initialReactions={post.reactions} />
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
    </>
  )
}
