"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { track } from "@vercel/analytics/react"

import { recordCsatResponse } from "@/lib/data/surveys"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase-browser"

const SCORES = [1, 2, 3, 4, 5] as const

const SCORE_LABELS: Record<(typeof SCORES)[number], string> = {
  1: "Very poor",
  2: "Poor",
  3: "Okay",
  4: "Good",
  5: "Excellent",
}

export interface CsatQuickPromptProps {
  open: boolean
  flow: string
  contextIdentifier: string | null
  onOpenChange: (open: boolean) => void
  metadata?: Record<string, unknown> | null
  title?: string
  description?: string
}

export function CsatQuickPrompt({
  open,
  flow,
  contextIdentifier,
  onOpenChange,
  metadata,
  title = "How was that flow?",
  description = "Quick rating keeps the experience sharp for every roommate.",
}: CsatQuickPromptProps) {
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const promptTrackedRef = useRef(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (open && contextIdentifier && !promptTrackedRef.current) {
      track("survey_csat_prompted", {
        flow,
        context_identifier: contextIdentifier,
      })
      promptTrackedRef.current = true
    }
  }, [open, flow, contextIdentifier])

  const resetState = () => {
    setScore(null)
    setComment("")
    setIsSubmitting(false)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && contextIdentifier) {
      if (promptTrackedRef.current && !submittedRef.current) {
        track("survey_csat_dismissed", {
          flow,
          context_identifier: contextIdentifier,
        })
      }

      promptTrackedRef.current = false
      submittedRef.current = false
      resetState()
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (score === null || !contextIdentifier) {
      toast({
        title: "Pick a rating",
        description: "Let us know how the flow felt before submitting.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        throw new Error("You need to be signed in to share feedback.")
      }

      const metadataPayload = { surface: "csat_quick_prompt", ...(metadata ?? {}) }

      await recordCsatResponse({
        client: supabase,
        userId: user.id,
        flow,
        contextIdentifier,
        score,
        comment,
        metadata: metadataPayload,
      })

      track("survey_csat_submitted", {
        flow,
        context_identifier: contextIdentifier,
        score,
      })

      toast({
        title: "Thanks for the quick rating!",
        description: "We’ll use it to keep flows smooth for the whole household.",
      })

      submittedRef.current = true
      handleDialogOpenChange(false)
    } catch (error) {
      console.error("Error submitting CSAT response", error)
      toast({
        title: "We couldn’t save that",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const descriptor = useMemo(() => {
    if (score === null) {
      return "Tap a score to continue"
    }

    return SCORE_LABELS[score as (typeof SCORES)[number]]
  }, [score])

  if (!contextIdentifier) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {SCORES.map((value) => (
              <Button
                key={value}
                type="button"
                variant={value === score ? "default" : "outline"}
                disabled={isSubmitting}
                onClick={() => setScore(value)}
                className={cn(
                  "h-10 w-10 rounded-full border",
                  value === score
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-foreground"
                )}
              >
                {value}
              </Button>
            ))}
          </div>
          <p className="text-sm font-medium text-muted-foreground">{descriptor}</p>

          <Textarea
            placeholder="Anything we should know?"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => handleDialogOpenChange(false)}
            >
              Skip
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
