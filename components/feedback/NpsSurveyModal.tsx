"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { persistNpsResponse } from "@/lib/feedback/persistence"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { toast } from "sonner"

const scores = Array.from({ length: 11 }, (_, index) => index)

interface NpsSurveyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss?: () => void
  onSubmitted?: () => void
  windowId: string
  userId: string
  quarterLabel: string
}

export function NpsSurveyModal({
  open,
  onOpenChange,
  onDismiss,
  onSubmitted,
  windowId,
  userId,
  quarterLabel,
}: NpsSurveyModalProps) {
  const supabase = useSupabaseBrowser()
  const client = supabase as unknown as TypedSupabaseClient
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const closingAfterSubmitRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setSelectedScore(null)
      setFeedback("")
      closingAfterSubmitRef.current = false
    }
  }, [open])

  const helperCopy = useMemo(() => {
    if (selectedScore === null) {
      return "0 = Not likely, 10 = Extremely likely"
    }

    if (selectedScore >= 9) {
      return "Promoter — love that you're cheering us on!"
    }

    if (selectedScore >= 7) {
      return "Passive — let us know how we can earn a 10."
    }

    return "Detractor — we appreciate the candor."
  }, [selectedScore])

  const handleSubmit = async () => {
    if (selectedScore === null) {
      return
    }

    setSubmitting(true)

    try {
      await persistNpsResponse(client, {
        userId,
        windowId,
        score: selectedScore,
        feedback: feedback.trim() || undefined,
      })

      toast.success("Thanks for the feedback!")
      closingAfterSubmitRef.current = true
      onSubmitted?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Unable to persist NPS response", error)
      toast.error("We couldn't save your score. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      if (!closingAfterSubmitRef.current) {
        onDismiss?.()
      }
      closingAfterSubmitRef.current = false
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            How likely are you to recommend Share House Portal?
          </DialogTitle>
          <DialogDescription>
            Quarterly NPS • {quarterLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Your score
            </Label>
            <div className="grid grid-cols-11 gap-2">
              {scores.map((score) => (
                <button
                  key={score}
                  type="button"
                  className={cn(
                    "rounded-md border px-2 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    selectedScore === score
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/60 hover:text-foreground",
                  )}
                  onClick={() => setSelectedScore(score)}
                  aria-pressed={selectedScore === score}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{helperCopy}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nps-notes" className="text-sm font-medium">
              Anything else we should know?
            </Label>
            <Textarea
              id="nps-notes"
              placeholder="Share context, wins, or points of friction."
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              maxLength={600}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Responses go straight to the property experience team.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleDialogChange(false)}
            disabled={submitting}
          >
            Not now
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedScore === null || submitting}
          >
            {submitting ? "Sending..." : "Submit score"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
