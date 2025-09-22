"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { MessageSummary, RoommateProfile, ThreadSummary } from "@/lib/poll-manager"

export type PollFormState = {
  threadId: string
  messageId?: string
  question: string
  options: string[]
  allowAnonymous: boolean
  closesAt: string
}

export type PollCreationResponse =
  | { success: true }
  | {
      success: false
      error: string
    }

const DEFAULT_OPTIONS = ["Yes", "No"] as const

const toDateTimeLocalValue = (date: Date) => {
  const isoValue = date.toISOString()
  return isoValue.slice(0, 16)
}

type PollBuilderProps = {
  threads: ThreadSummary[]
  messages: MessageSummary[]
  roommates: RoommateProfile[]
  currentUserId: string | null
  onCreate: (data: PollFormState) => PollCreationResponse
}

const PollBuilder = ({ threads, messages, roommates, currentUserId, onCreate }: PollBuilderProps) => {
  const defaultThreadId = threads[0]?.id ?? ""
  const [threadId, setThreadId] = useState<string>(defaultThreadId)
  const [messageId, setMessageId] = useState<string | undefined>(undefined)
  const [question, setQuestion] = useState<string>("")
  const [options, setOptions] = useState<string[]>(() => [...DEFAULT_OPTIONS])
  const [allowAnonymous, setAllowAnonymous] = useState<boolean>(true)
  const [closesAt, setClosesAt] = useState<string>(() =>
    toDateTimeLocalValue(new Date(Date.now() + 1000 * 60 * 60 * 24)),
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusVariant, setStatusVariant] = useState<"success" | "error" | null>(null)

  const threadMessages = useMemo(
    () => messages.filter((message) => message.threadId === threadId),
    [messages, threadId],
  )

  useEffect(() => {
    if (!threadId) {
      setMessageId(undefined)
      return
    }

    if (threadMessages.length === 0) {
      setMessageId(undefined)
      return
    }

    setMessageId((previous) => previous ?? threadMessages[0]?.id)
  }, [threadId, threadMessages])

  const roommateDirectory = useMemo(
    () =>
      roommates.reduce<Record<string, string>>((directory, roommate) => {
        directory[roommate.id] = roommate.name
        return directory
      }, {}),
    [roommates],
  )

  const resetForm = () => {
    setQuestion("")
    setOptions([...DEFAULT_OPTIONS])
    setAllowAnonymous(true)
    setClosesAt(toDateTimeLocalValue(new Date(Date.now() + 1000 * 60 * 60 * 24)))
    setStatusVariant(null)
    setStatusMessage(null)
  }

  const handleOptionChange = (value: string, index: number) => {
    setOptions((currentOptions) => currentOptions.map((option, optionIndex) => (optionIndex === index ? value : option)))
  }

  const handleAddOption = () => {
    setOptions((currentOptions) => [...currentOptions, ""])
  }

  const handleRemoveOption = (index: number) => {
    setOptions((currentOptions) => currentOptions.filter((_, optionIndex) => optionIndex !== index))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUserId) {
      setStatusVariant("error")
      setStatusMessage("Select who you are before creating a poll.")
      return
    }

    if (!closesAt) {
      setStatusVariant("error")
      setStatusMessage("Choose when the poll should close.")
      return
    }

    const payload: PollFormState = {
      threadId,
      messageId,
      question,
      options,
      allowAnonymous,
      closesAt,
    }

    const response = onCreate(payload)

    if (response.success) {
      setStatusVariant("success")
      setStatusMessage("Poll created and shared to the thread.")
      resetForm()
      return
    }

    setStatusVariant("error")
    setStatusMessage(response.error)
  }

  const hasMessagesForThread = threadMessages.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a poll</CardTitle>
        <CardDescription>
          Collect decisions from roommates by attaching polls directly to an existing thread message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="poll-thread">Thread</Label>
              <Select onValueChange={setThreadId} value={threadId}>
                <SelectTrigger id="poll-thread">
                  <SelectValue placeholder="Select a thread" />
                </SelectTrigger>
                <SelectContent>
                  {threads.map((thread) => (
                    <SelectItem key={thread.id} value={thread.id}>
                      {thread.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-message">Message</Label>
              <Select
                disabled={!hasMessagesForThread}
                onValueChange={setMessageId}
                value={messageId ?? (hasMessagesForThread ? threadMessages[0]?.id : "")}
              >
                <SelectTrigger id="poll-message">
                  <SelectValue placeholder="Select a message" />
                </SelectTrigger>
                <SelectContent>
                  {threadMessages.map((message) => (
                    <SelectItem key={message.id} value={message.id}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{roommateDirectory[message.authorId] ?? "Roommate"}</span>
                        <span className="text-xs text-muted-foreground">{message.body.slice(0, 60)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!hasMessagesForThread ? (
                <p className="text-xs text-muted-foreground">There are no messages in this thread yet.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-question">Question</Label>
            <Textarea
              id="poll-question"
              placeholder="Where should we host the next roommate dinner?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div className="flex items-center gap-2" key={`poll-option-${index}`}>
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(event) => handleOptionChange(event.target.value, index)}
                  />
                  {options.length > 2 ? (
                    <Button
                      aria-label={`Remove option ${index + 1}`}
                      onClick={() => handleRemoveOption(index)}
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            <Button onClick={handleAddOption} type="button" variant="outline">
              Add another option
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="poll-anonymous">Anonymous voting</Label>
                <p className="text-xs text-muted-foreground">Hide who voted while still counting their responses.</p>
              </div>
              <Switch
                checked={allowAnonymous}
                id="poll-anonymous"
                onCheckedChange={setAllowAnonymous}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-closes-at">Poll closes</Label>
              <Input
                id="poll-closes-at"
                min={toDateTimeLocalValue(new Date())}
                onChange={(event) => setClosesAt(event.target.value)}
                type="datetime-local"
                value={closesAt}
              />
              <p className="text-xs text-muted-foreground">Voting automatically closes at the selected time.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button disabled={!threads.length || !currentUserId} type="submit">
              Publish poll to thread
            </Button>
            {!currentUserId ? (
              <p className="text-xs text-muted-foreground">Select yourself above to create a poll.</p>
            ) : null}
            {statusMessage ? (
              <p
                className={`text-sm ${statusVariant === "success" ? "text-green-600" : "text-destructive"}`}
                role={statusVariant === "error" ? "alert" : undefined}
              >
                {statusMessage}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default PollBuilder
