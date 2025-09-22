"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import PollBuilder, { type PollCreationResponse, type PollFormState } from "@/components/messaging/poll-builder"
import PollCard, { type VoteResponse } from "@/components/messaging/poll-card"
import { castVote, createPoll, type MessageSummary, type Poll, type RoommateProfile, type ThreadSummary } from "@/lib/poll-manager"

type PollCenterProps = {
  threads: ThreadSummary[]
  messages: MessageSummary[]
  roommates: RoommateProfile[]
}

const PollCenter = ({ threads, messages, roommates }: PollCenterProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(roommates[0]?.id ?? null)

  const initialPolls = useMemo(() => {
    if (!threads.length) {
      return [] as Poll[]
    }

    const defaultThread = threads[0]
    const threadMessages = messages.filter((message) => message.threadId === defaultThread.id)
    const primaryMessage = threadMessages[0]

    const creatorId = roommates[0]?.id ?? "system"

    try {
      const basePoll = createPoll(
        {
          threadId: defaultThread.id,
          messageId: primaryMessage?.id,
          question: "When should we schedule the next deep clean?",
          options: ["Sunday afternoon", "Wednesday evening", "Hire cleaners monthly"],
          allowAnonymous: false,
          closesAt: new Date(Date.now() + 1000 * 60 * 60 * 12),
          createdBy: creatorId,
        },
        new Date(Date.now() - 1000 * 60 * 15),
      )

      const seededPoll = roommates.slice(1, Math.min(roommates.length, 4)).reduce((poll, roommate, index) => {
        const voteTime = new Date(Date.now() - (index + 1) * 1000 * 60 * 5)
        const optionIndex = index % poll.options.length
        return castVote(poll, optionIndex, roommate.id, voteTime)
      }, basePoll)

      return [seededPoll]
    } catch {
      return [] as Poll[]
    }
  }, [messages, roommates, threads])

  const [polls, setPolls] = useState<Poll[]>(initialPolls)

  const threadDirectory = useMemo(
    () =>
      threads.reduce<Record<string, ThreadSummary>>((directory, thread) => {
        directory[thread.id] = thread
        return directory
      }, {}),
    [threads],
  )

  const messageDirectory = useMemo(
    () =>
      messages.reduce<Record<string, MessageSummary>>((directory, message) => {
        directory[message.id] = message
        return directory
      }, {}),
    [messages],
  )

  const handleCreatePoll = (formState: PollFormState): PollCreationResponse => {
    if (!currentUserId) {
      return { success: false, error: "Select a roommate profile before creating a poll." }
    }

    if (!formState.closesAt) {
      return { success: false, error: "Choose a closing time for the poll." }
    }

    try {
      const poll = createPoll(
        {
          threadId: formState.threadId,
          messageId: formState.messageId,
          question: formState.question,
          options: formState.options,
          allowAnonymous: formState.allowAnonymous,
          closesAt: new Date(formState.closesAt),
          createdBy: currentUserId,
        },
        new Date(),
      )

      setPolls((currentPolls) => [poll, ...currentPolls])
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unable to create poll.",
      }
    }
  }

  const handleVote = (pollId: string, optionIndex: number): VoteResponse => {
    if (!currentUserId) {
      return { success: false, error: "Select a roommate profile to vote." }
    }

    try {
      setPolls((currentPolls) =>
        currentPolls.map((poll) => {
          if (poll.id !== pollId) {
            return poll
          }

          return castVote(poll, optionIndex, currentUserId, new Date())
        }),
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unable to record vote.",
      }
    }
  }

  const handleUserChange = (value: string) => {
    setCurrentUserId(value || null)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Poll coordination</CardTitle>
          <CardDescription>
            Choose who you are acting as and draft a poll to include in a thread message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Responding as</span>
                <Select onValueChange={handleUserChange} value={currentUserId ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a roommate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Spectator (no votes)</SelectItem>
                    {roommates.map((roommate) => (
                      <SelectItem key={roommate.id} value={roommate.id}>
                        {roommate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecting a roommate lets you preview how the experience changes once someone has voted. You can still create and
                manage polls without posting real messages.
              </p>
            </div>
            <PollBuilder
              currentUserId={currentUserId}
              messages={messages}
              onCreate={handleCreatePoll}
              roommates={roommates}
              threads={threads}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {polls.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Create a poll to start collecting votes in your roommate threads.
            </CardContent>
          </Card>
        ) : (
          polls.map((poll) => (
            <PollCard
              key={poll.id}
              currentUserId={currentUserId}
              message={poll.messageId ? messageDirectory[poll.messageId] : undefined}
              onVote={handleVote}
              poll={poll}
              roommates={roommates}
              thread={threadDirectory[poll.threadId]}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default PollCenter
