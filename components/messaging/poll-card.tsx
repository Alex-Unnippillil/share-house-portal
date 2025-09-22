"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { getPollResults, getVotesByOption, isPollClosed, type MessageSummary, type Poll, type RoommateProfile, type ThreadSummary } from "@/lib/poll-manager"

import { formatDistanceToNow } from "date-fns"

export type VoteResponse =
  | { success: true }
  | {
      success: false
      error: string
    }

type PollCardProps = {
  poll: Poll
  thread?: ThreadSummary
  message?: MessageSummary
  roommates: RoommateProfile[]
  currentUserId: string | null
  onVote: (pollId: string, optionIndex: number) => VoteResponse | Promise<VoteResponse>
}

const PollCard = ({ poll, thread, message, roommates, currentUserId, onVote }: PollCardProps) => {
  const [now, setNow] = useState<Date>(() => new Date())
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackVariant, setFeedbackVariant] = useState<"success" | "error" | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date())
    }, 30000)

    return () => window.clearInterval(interval)
  }, [])

  const roommateDirectory = useMemo(
    () =>
      roommates.reduce<Record<string, string>>((directory, roommate) => {
        directory[roommate.id] = roommate.name
        return directory
      }, {}),
    [roommates],
  )

  const closed = isPollClosed(poll, now)
  const results = getPollResults(poll)
  const votesByOption = getVotesByOption(poll)
  const totalVotes = poll.votes.length
  const currentVote = poll.votes.find((vote) => vote.voterId === currentUserId)

  const voteDisabledReason = useMemo(() => {
    if (!currentUserId) {
      return "Select a roommate profile to vote."
    }

    if (closed) {
      return "Voting has closed for this poll."
    }

    if (currentVote) {
      return "You already voted."
    }

    return null
  }, [closed, currentUserId, currentVote])

  const handleVote = async (optionIndex: number) => {
    if (voteDisabledReason) {
      setFeedbackVariant("error")
      setFeedback(voteDisabledReason)
      return
    }

    const response = await onVote(poll.id, optionIndex)

    if (response.success) {
      setFeedbackVariant("success")
      setFeedback("Vote recorded.")
      return
    }

    setFeedbackVariant("error")
    setFeedback(response.error)
  }

  const closingDescriptor = formatDistanceToNow(new Date(poll.closesAt), {
    addSuffix: true,
  })
  const closingLabel = closed ? `Closed ${closingDescriptor}` : `Closes ${closingDescriptor}`

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {thread ? <span>{thread.title}</span> : null}
          {thread && message ? <span aria-hidden>•</span> : null}
          {message ? <span>{message.body.slice(0, 50)}{message.body.length > 50 ? "…" : ""}</span> : null}
        </div>
        <CardTitle className="text-xl">{poll.question}</CardTitle>
        <CardDescription>
          <span className="font-medium">{totalVotes}</span> vote{totalVotes === 1 ? "" : "s"} · {poll.allowAnonymous ? "Anonymous" : "Names visible"}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={closed ? "secondary" : "outline"}>{closed ? "Voting closed" : "Open for votes"}</Badge>
          <span>{closingLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.map((result) => {
          const optionVotes = votesByOption[result.optionIndex] ?? []
          const voters = optionVotes.map((vote) => roommateDirectory[vote.voterId] ?? "Roommate")
          const isUsersSelection = currentVote?.optionIndex === result.optionIndex

          return (
            <div className="space-y-2" key={`poll-${poll.id}-option-${result.optionIndex}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.text}</span>
                <span className="text-sm text-muted-foreground">
                  {result.voteCount} vote{result.voteCount === 1 ? "" : "s"} · {result.percentage}%
                </span>
              </div>
              <Progress className="h-2" value={result.percentage} />
              {!poll.allowAnonymous && voters.length > 0 ? (
                <p className="text-xs text-muted-foreground">{voters.join(", ")}</p>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  disabled={Boolean(voteDisabledReason)}
                  onClick={() => handleVote(result.optionIndex)}
                  type="button"
                  variant={isUsersSelection ? "default" : "outline"}
                >
                  {isUsersSelection ? "Your vote" : "Vote"}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        {feedback ? (
          <p className={`text-sm ${feedbackVariant === "success" ? "text-green-600" : "text-destructive"}`}>{feedback}</p>
        ) : null}
        {message ? (
          <p className="text-xs text-muted-foreground">Posted by {roommateDirectory[message.authorId] ?? "Roommate"}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}</p>
      </CardFooter>
    </Card>
  )
}

export default PollCard
