"use client"

import { FormEvent, useMemo, useState } from "react"
import { PlusCircle, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { MessageMetadataShape, PollOptionMeta } from "@/types/messages"
import { useMessagesContext } from "./messages-provider"

interface MessageComposerProps {
  threadId: string
  isLocked: boolean
}

function createOption(): PollOptionMeta {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return { id: crypto.randomUUID(), label: "" }
  }

  return { id: `option-${Math.random().toString(36).slice(2, 10)}`, label: "" }
}

export default function MessageComposer({ threadId, isLocked }: MessageComposerProps) {
  const { sendMessage } = useMessagesContext()
  const [body, setBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPoll, setIsPoll] = useState(false)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [maintenanceId, setMaintenanceId] = useState("")
  const [options, setOptions] = useState<PollOptionMeta[]>([createOption(), createOption()])

  const canSubmitPoll = useMemo(
    () =>
      options.filter((option) => option.label.trim().length > 0).length >= 2,
    [options],
  )

  const resetForm = () => {
    setBody("")
    setIsPoll(false)
    setAllowMultiple(false)
    setMaintenanceId("")
    setOptions([createOption(), createOption()])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLocked || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      const metadata: MessageMetadataShape = {}
      if (maintenanceId.trim()) {
        metadata.maintenanceTicketId = maintenanceId.trim()
      }

      if (isPoll) {
        const preparedOptions = options
          .filter((option) => option.label.trim().length > 0)
          .map((option) => ({
            id: option.id,
            label: option.label.trim(),
          }))

        if (preparedOptions.length < 2) {
          return
        }

        metadata.poll = {
          options: preparedOptions,
          allowMultiple,
        }

        await sendMessage({
          threadId,
          body: "",
          messageType: "poll",
          metadata,
        })
      } else {
        if (!body.trim()) {
          return
        }

        await sendMessage({
          threadId,
          body: body.trim(),
          metadata,
        })
      }

      resetForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {isLocked ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/60 dark:bg-red-950/40 dark:text-red-200">
          This thread is locked. Only moderators can add new messages.
        </p>
      ) : null}
      {!isPoll ? (
        <div className="space-y-1">
          <Label htmlFor="message-body">Message</Label>
          <Textarea
            id="message-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share an update with your roommates"
            disabled={isLocked}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Poll options</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOptions((prev) => [...prev, createOption()])}
              disabled={options.length >= 6}
            >
              <PlusCircle className="mr-2 size-4" /> Add option
            </Button>
          </div>
          <div className="space-y-2">
            {options.map((option, index) => (
              <Input
                key={option.id}
                value={option.label}
                onChange={(event) => {
                  const value = event.target.value
                  setOptions((prev) =>
                    prev.map((item) =>
                      item.id === option.id ? { ...item, label: value } : item,
                    ),
                  )
                }}
                placeholder={`Option ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
            Allow multiple selections
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="maintenance-ticket">Maintenance ticket (optional)</Label>
        <Input
          id="maintenance-ticket"
          value={maintenanceId}
          onChange={(event) => setMaintenanceId(event.target.value)}
          placeholder="TCK-1234"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant={isPoll ? "secondary" : "ghost"}
          onClick={() => setIsPoll((value) => !value)}
        >
          {isPoll ? "Switch to message" : "Create poll"}
        </Button>
        <Button
          type="submit"
          disabled={
            isLocked ||
            isSubmitting ||
            (!isPoll && !body.trim()) ||
            (isPoll && !canSubmitPoll)
          }
        >
          <Send className="mr-2 size-4" />
          {isSubmitting ? "Sending" : "Send"}
        </Button>
      </div>
    </form>
  )
}
