"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  MessageCirclePlus,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"

import type {
  CommunityChannel,
  CommunityMessage,
  CommunityProfile,
} from "../types"
import {
  applyRealtimeChannelChange,
  applyRealtimeMessageChange,
  buildThreads,
  canModerateMessage,
  canPinThread,
  createNotificationPreview,
  getInitials,
  type ChannelChange,
  type MessageChange,
} from "./lib/message-utils"

interface CommunityBoardProps {
  initialChannels: CommunityChannel[]
  initialMessages: CommunityMessage[]
  viewerId: string
  viewerRole: string | null
  viewerProfile: CommunityProfile | null
}

const DEFAULT_FILTER_VALUE = "all"

export default function CommunityBoard({
  initialChannels,
  initialMessages,
  viewerId,
  viewerRole,
  viewerProfile,
}: CommunityBoardProps) {
  const supabase = useSupabaseBrowser()
  const [channels, setChannels] = useState<CommunityChannel[]>(initialChannels)
  const [messages, setMessages] = useState<CommunityMessage[]>(() =>
    initialMessages.map((message) => ({ ...message, pending: Boolean(message.pending) }))
  )
  const [topicFilter, setTopicFilter] = useState(DEFAULT_FILTER_VALUE)
  const [buildingFilter, setBuildingFilter] = useState(DEFAULT_FILTER_VALUE)
  const [threadTitle, setThreadTitle] = useState("")
  const [threadContent, setThreadContent] = useState("")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [pendingReplies, setPendingReplies] = useState<Record<string, boolean>>({})
  const [isSubmittingThread, setIsSubmittingThread] = useState(false)

  const initialChannelId = initialChannels[0]?.id ?? null
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannelId
  )

  const [profileCache, setProfileCache] = useState<Record<string, CommunityProfile>>(
    () => {
      const cache: Record<string, CommunityProfile> = {}
      if (viewerProfile) {
        cache[viewerProfile.id] = viewerProfile
      }
      initialMessages.forEach((message) => {
        if (message.author) {
          cache[message.author.id] = message.author
        }
      })
      return cache
    }
  )

  const profileCacheRef = useRef(profileCache)
  const channelsRef = useRef(channels)

  useEffect(() => {
    profileCacheRef.current = profileCache
  }, [profileCache])

  useEffect(() => {
    channelsRef.current = channels
  }, [channels])

  const ensureProfile = useCallback(
    async (userId: string) => {
      if (profileCacheRef.current[userId]) {
        return profileCacheRef.current[userId]
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("id", userId)
        .maybeSingle()

      if (error || !data) {
        return null
      }

      setProfileCache((current) => {
        if (current[data.id]) {
          return current
        }
        return { ...current, [data.id]: data }
      })

      return data
    },
    [supabase]
  )

  const topics = useMemo(() => {
    const unique = new Set<string>()
    channels.forEach((channel) => {
      if (channel.topic) {
        unique.add(channel.topic)
      }
    })
    return Array.from(unique)
  }, [channels])

  const buildings = useMemo(() => {
    const unique = new Set<string>()
    channels.forEach((channel) => {
      if (channel.building) {
        unique.add(channel.building)
      }
    })
    return Array.from(unique)
  }, [channels])

  const visibleChannels = useMemo(
    () =>
      channels.filter((channel) => {
        const matchesTopic =
          topicFilter === DEFAULT_FILTER_VALUE || channel.topic === topicFilter
        const matchesBuilding =
          buildingFilter === DEFAULT_FILTER_VALUE || channel.building === buildingFilter

        return matchesTopic && matchesBuilding
      }),
    [channels, topicFilter, buildingFilter]
  )

  useEffect(() => {
    if (visibleChannels.length === 0) {
      setSelectedChannelId(null)
      return
    }

    if (!selectedChannelId) {
      setSelectedChannelId(visibleChannels[0].id)
      return
    }

    const exists = visibleChannels.some((channel) => channel.id === selectedChannelId)
    if (!exists) {
      setSelectedChannelId(visibleChannels[0].id)
    }
  }, [visibleChannels, selectedChannelId])

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  )

  const channelMessages = useMemo(() => {
    if (!selectedChannelId) {
      return []
    }
    return messages.filter((message) => message.channel_id === selectedChannelId)
  }, [messages, selectedChannelId])

  const visibleMessages = useMemo(
    () => channelMessages.filter((message) => !message.is_deleted),
    [channelMessages]
  )

  const threads = useMemo(() => buildThreads(visibleMessages), [visibleMessages])

  const handleCreateThread = useCallback(async () => {
    if (!selectedChannelId || !threadContent.trim()) {
      toast({
        variant: "destructive",
        title: "Add a message",
        description: "Please write a message before posting a new thread.",
      })
      return
    }

    setIsSubmittingThread(true)
    const content = threadContent.trim()
    const title = threadTitle.trim() || null
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage: CommunityMessage = {
      id: optimisticId,
      optimisticId,
      pending: true,
      channel_id: selectedChannelId,
      author_id: viewerId,
      parent_id: null,
      title,
      content,
      created_at: new Date().toISOString(),
      is_deleted: false,
      is_pinned: false,
      author: viewerProfile ?? profileCacheRef.current[viewerId] ?? null,
    }

    setMessages((previous) => [...previous, optimisticMessage])

    const { data, error } = await supabase
      .from("community_messages")
      .insert({
        channel_id: selectedChannelId,
        title,
        content,
      })
      .select(
        "id, channel_id, author_id, parent_id, title, content, created_at, is_deleted, is_pinned"
      )
      .single()

    if (!data || error) {
      setMessages((previous) => previous.filter((message) => message.id !== optimisticId))
      setIsSubmittingThread(false)
      toast({
        variant: "destructive",
        title: "Unable to create thread",
        description: error?.message ?? "Please try again shortly.",
      })
      return
    }

    const hydrated: CommunityMessage = {
      ...data,
      author: viewerProfile ?? profileCacheRef.current[viewerId] ?? null,
      pending: false,
    }

    setMessages((previous) =>
      previous.map((message) => (message.id === optimisticId ? hydrated : message))
    )
    setThreadTitle("")
    setThreadContent("")
    setIsSubmittingThread(false)
  }, [selectedChannelId, threadContent, threadTitle, supabase, viewerId, viewerProfile])

  const handleReplySubmit = useCallback(
    async (threadId: string) => {
      if (!selectedChannelId) {
        return
      }
      const draft = replyDrafts[threadId]?.trim()
      if (!draft) {
        toast({
          variant: "destructive",
          title: "Add a reply",
          description: "Please write a message before replying.",
        })
        return
      }

      setPendingReplies((previous) => ({ ...previous, [threadId]: true }))
      const optimisticId = `optimistic-reply-${Date.now()}`
      const optimisticMessage: CommunityMessage = {
        id: optimisticId,
        optimisticId,
        pending: true,
        channel_id: selectedChannelId,
        author_id: viewerId,
        parent_id: threadId,
        title: null,
        content: draft,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_pinned: false,
        author: viewerProfile ?? profileCacheRef.current[viewerId] ?? null,
      }

      setMessages((previous) => [...previous, optimisticMessage])
      setReplyDrafts((previous) => ({ ...previous, [threadId]: "" }))

      const { data, error } = await supabase
        .from("community_messages")
        .insert({
          channel_id: selectedChannelId,
          parent_id: threadId,
          content: draft,
        })
        .select(
          "id, channel_id, author_id, parent_id, title, content, created_at, is_deleted, is_pinned"
        )
        .single()

      if (!data || error) {
        setMessages((previous) =>
          previous.filter((message) => message.id !== optimisticId)
        )
        setPendingReplies((previous) => ({ ...previous, [threadId]: false }))
        toast({
          variant: "destructive",
          title: "Unable to post reply",
          description: error?.message ?? "Please try again shortly.",
        })
        return
      }

      const hydrated: CommunityMessage = {
        ...data,
        author: viewerProfile ?? profileCacheRef.current[viewerId] ?? null,
        pending: false,
      }

      setMessages((previous) =>
        previous.map((message) => (message.id === optimisticId ? hydrated : message))
      )
      setPendingReplies((previous) => ({ ...previous, [threadId]: false }))
    },
    [replyDrafts, selectedChannelId, supabase, viewerId, viewerProfile]
  )

  const handleDeleteMessage = useCallback(
    async (message: CommunityMessage) => {
      const previousMessages = messages
      setMessages((current) =>
        applyRealtimeMessageChange(current, {
          type: "DELETE",
          record: { id: message.id },
        })
      )

      const { error } = await supabase
        .from("community_messages")
        .delete()
        .eq("id", message.id)

      if (error) {
        setMessages(previousMessages)
        toast({
          variant: "destructive",
          title: "Unable to remove message",
          description: error.message,
        })
      }
    },
    [messages, supabase]
  )

  const handleTogglePin = useCallback(
    async (threadId: string, shouldPin: boolean, channelId: string) => {
      const previousMessages = messages
      const previousChannels = channels

      setMessages((current) =>
        current.map((message) => {
          if (message.id === threadId) {
            return { ...message, is_pinned: shouldPin }
          }
          if (shouldPin && message.channel_id === channelId && !message.parent_id) {
            return { ...message, is_pinned: false }
          }
          return message
        })
      )

      setChannels((current) =>
        current.map((channel) =>
          channel.id === channelId
            ? { ...channel, pinned_message_id: shouldPin ? threadId : null }
            : channel
        )
      )

      const { error: messageError } = await supabase
        .from("community_messages")
        .update({ is_pinned: shouldPin })
        .eq("id", threadId)

      if (messageError) {
        setMessages(previousMessages)
        setChannels(previousChannels)
        toast({
          variant: "destructive",
          title: "Unable to update pin",
          description: messageError.message,
        })
        return
      }

      const { error: channelError } = await supabase
        .from("community_channels")
        .update({ pinned_message_id: shouldPin ? threadId : null })
        .eq("id", channelId)

      if (channelError) {
        setMessages(previousMessages)
        setChannels(previousChannels)
        toast({
          variant: "destructive",
          title: "Unable to update channel",
          description: channelError.message,
        })
      }
    },
    [channels, messages, supabase]
  )

  useEffect(() => {
    const messageSubscription = supabase
      .channel("community-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const record = payload.new as CommunityMessage
            const authorProfile =
              record.author_id === viewerId
                ? viewerProfile ?? profileCacheRef.current[viewerId] ?? null
                : await ensureProfile(record.author_id)

            const enriched: CommunityMessage = {
              ...record,
              author: authorProfile,
            }

            setMessages((current) =>
              applyRealtimeMessageChange(current, {
                type: payload.eventType as MessageChange["type"],
                record: enriched,
              })
            )

            if (payload.eventType === "INSERT" && record.author_id !== viewerId) {
              const channelName =
                channelsRef.current.find((channel) => channel.id === record.channel_id)?.name ??
                "Community"
              toast({
                title: `New ${record.parent_id ? "reply" : "thread"} in ${channelName}`,
                description: createNotificationPreview(record.content),
              })
            }
          } else if (payload.eventType === "DELETE") {
            const record = payload.old as { id: string }
            setMessages((current) =>
              applyRealtimeMessageChange(current, {
                type: "DELETE",
                record,
              })
            )
          }
        }
      )
      .subscribe()

    const channelSubscription = supabase
      .channel("community-channels")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_channels",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const record = payload.old as { id: string }
            setChannels((current) =>
              applyRealtimeChannelChange(current, {
                type: "DELETE",
                record,
              })
            )
            return
          }

          const record = payload.new as CommunityChannel
          setChannels((current) =>
            applyRealtimeChannelChange(current, {
              type: payload.eventType as ChannelChange["type"],
              record,
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
      supabase.removeChannel(channelSubscription)
    }
  }, [ensureProfile, supabase, viewerId, viewerProfile])

  const channelValue = selectedChannelId ?? ""
  const viewerIsAdmin = canModerateMessage(viewerRole)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Community filters</CardTitle>
          <CardDescription>
            Narrow channels by topic or building to find the conversations that matter most.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="topic-filter">Topic</Label>
            <Select
              value={topicFilter}
              onValueChange={setTopicFilter}
            >
              <SelectTrigger id="topic-filter">
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FILTER_VALUE}>All topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="building-filter">Building</Label>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger id="building-filter">
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FILTER_VALUE}>All buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building} value={building}>
                    {building}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="channel-filter">Channel</Label>
            <Select
              value={channelValue}
              onValueChange={(value) => setSelectedChannelId(value || null)}
              disabled={visibleChannels.length === 0}
            >
              <SelectTrigger id="channel-filter">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {visibleChannels.length === 0 ? (
                  <SelectItem value="" disabled>
                    No channels available
                  </SelectItem>
                ) : (
                  visibleChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedChannel ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl font-semibold">
                {selectedChannel.name}
              </CardTitle>
              {selectedChannel.topic ? (
                <Badge variant="secondary">{selectedChannel.topic}</Badge>
              ) : null}
              {selectedChannel.building ? (
                <Badge variant="outline">{selectedChannel.building}</Badge>
              ) : null}
            </div>
            <CardDescription>
              {selectedChannel.description ||
                "Start the conversation with your neighbors and share updates in real time."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreateThread()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="thread-title">Thread subject</Label>
                <Input
                  id="thread-title"
                  placeholder="Optional subject"
                  value={threadTitle}
                  onChange={(event) => setThreadTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thread-content">Message</Label>
                <Textarea
                  id="thread-content"
                  placeholder="Share an update, ask a question, or start a new discussion"
                  value={threadContent}
                  onChange={(event) => setThreadContent(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Posting as {viewerProfile?.full_name ?? "you"}
                </span>
                <Button
                  type="submit"
                  disabled={isSubmittingThread || !threadContent.trim()}
                >
                  <MessageCirclePlus className="mr-2 size-4" />
                  Start thread
                </Button>
              </div>
            </form>

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Active threads</h2>
                <p className="text-sm text-muted-foreground">
                  Pinned discussions appear first and stay visible to everyone.
                </p>
              </div>
              {threads.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No conversations yet. Be the first to start a discussion.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {threads.map((thread) => {
                    const isPinned = thread.root.is_pinned
                    const replies = thread.replies
                    const replyDraft = replyDrafts[thread.root.id] ?? ""
                    const isReplyPending = pendingReplies[thread.root.id]

                    return (
                      <Card
                        key={thread.root.id}
                        className={cn(
                          "space-y-4 border-l-4",
                          isPinned ? "border-primary" : "border-transparent",
                          thread.root.pending && "opacity-70"
                        )}
                      >
                        <CardHeader className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-1 items-start gap-3">
                              <Avatar>
                                <AvatarImage src={thread.root.author?.avatar_url ?? undefined} />
                                <AvatarFallback>
                                  {getInitials(thread.root.author?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold">
                                    {thread.root.author?.full_name ?? "Unknown resident"}
                                  </span>
                                  {thread.root.author_id === viewerId ? (
                                    <Badge variant="outline">You</Badge>
                                  ) : null}
                                  {isPinned ? <Badge variant="secondary">Pinned</Badge> : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(thread.root.created_at), {
                                    addSuffix: true,
                                  })}
                                </div>
                              </div>
                            </div>
                            {(viewerIsAdmin || canPinThread(viewerRole, thread.root)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuLabel>Moderator actions</DropdownMenuLabel>
                                  {canPinThread(viewerRole, thread.root) ? (
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault()
                                        void handleTogglePin(
                                          thread.root.id,
                                          !isPinned,
                                          thread.root.channel_id
                                        )
                                      }}
                                    >
                                      {isPinned ? (
                                        <PinOff className="mr-2 size-4" />
                                      ) : (
                                        <Pin className="mr-2 size-4" />
                                      )}
                                      {isPinned ? "Unpin thread" : "Pin thread"}
                                    </DropdownMenuItem>
                                  ) : null}
                                  {viewerIsAdmin ? <DropdownMenuSeparator /> : null}
                                  {viewerIsAdmin ? (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={(event) => {
                                        event.preventDefault()
                                        void handleDeleteMessage(thread.root)
                                      }}
                                    >
                                      <Trash2 className="mr-2 size-4" />
                                      Delete thread
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {thread.root.title ? (
                            <CardTitle className="text-xl font-semibold">
                              {thread.root.title}
                            </CardTitle>
                          ) : null}
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {thread.root.content}
                          </p>
                        </CardHeader>
                        {replies.length > 0 ? (
                          <CardContent className="space-y-4 pt-0">
                            {replies.map((reply) => (
                              <div
                                key={reply.id}
                                className={cn(
                                  "flex gap-3",
                                  reply.pending && "opacity-70"
                                )}
                              >
                                <Avatar className="size-8">
                                  <AvatarImage src={reply.author?.avatar_url ?? undefined} />
                                  <AvatarFallback>
                                    {getInitials(reply.author?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">
                                      {reply.author?.full_name ?? "Unknown resident"}
                                    </span>
                                    {reply.author_id === viewerId ? (
                                      <Badge variant="outline">You</Badge>
                                    ) : null}
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.created_at), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                    {reply.content}
                                  </p>
                                </div>
                                {viewerIsAdmin ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => void handleDeleteMessage(reply)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                          </CardContent>
                        ) : null}
                        <CardContent className="space-y-3 pt-0">
                          <Textarea
                            placeholder="Add a reply"
                            value={replyDraft}
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [thread.root.id]: event.target.value,
                              }))
                            }
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleReplySubmit(thread.root.id)}
                              disabled={
                                !replyDraft.trim() ||
                                Boolean(isReplyPending)
                              }
                            >
                              Reply
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No channels available yet. Once an administrator creates a channel, it will appear here.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
