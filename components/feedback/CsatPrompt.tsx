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
import { persistCsatResponse } from "@/lib/feedback/persistence"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { toast } from "sonner"

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const

const copyByContext: Record<
  'document_signed' | 'maintenance_resolved',
  { title: string; description: string; followUp: string }
> = {
  document_signed: {
    title: 'How was signing your document?',
    description: 'Quick CSAT pulse to confirm the Documenso experience met expectations.',
    followUp: 'Anything you want your property manager to know about this signing experience?',
  },
  maintenance_resolved: {
    title: 'Maintenance taken care of?',
    description: 'Rate how satisfied you are with the resolution of this maintenance ticket.',
    followUp: 'Share a quick note about the fix or technician visit (optional).',
  },
}

interface CsatPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss?: () => void
  onSubmitted?: () => void
  userId: string
  context: 'document_signed' | 'maintenance_resolved'
  contextId?: string
  entityName?: string
  metadata?: Record<string, unknown>
}

export function CsatPrompt({
  open,
  onOpenChange,
  onDismiss,
  onSubmitted,
  userId,
  context,
  contextId,
  entityName,
  metadata,
}: CsatPromptProps) {
  const supabase = useSupabaseBrowser()
  const client = supabase as unknown as TypedSupabaseClient
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const closingAfterSubmit = useRef(false)

  useEffect(() => {
    if (!open) {
      setRating(null)
      setComment("")
      closingAfterSubmit.current = false
    }
  }, [open])

  const contextCopy = copyByContext[context]

  const ratingCaption = useMemo(() => {
    if (rating === null) {
      return "1 = Very dissatisfied, 5 = Very satisfied"
    }

    switch (rating) {
      case 5:
        return "Love it — everything was handled perfectly."
      case 4:
        return "Great overall — just a few tweaks away from perfect."
      case 3:
        return "It was okay — there’s room to improve."
      case 2:
        return "Not great — we should revisit this process."
      default:
        return "Rough experience — thanks for flagging it."
    }
  }, [rating])

  const handleSubmit = async () => {
    if (rating === null) {
      return
    }

    setSubmitting(true)

    try {
      await persistCsatResponse(client, {
        userId,
        context,
        contextId,
        rating,
        comment: comment.trim() || undefined,
        metadata,
      })

      toast.success("Feedback received — thank you!")
      closingAfterSubmit.current = true
      onSubmitted?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Unable to persist CSAT response", error)
      toast.error("We couldn't save your response. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      if (!closingAfterSubmit.current) {
        onDismiss?.()
      }
      closingAfterSubmit.current = false
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {contextCopy.title}
          </DialogTitle>
          <DialogDescription className="space-y-1 text-sm text-muted-foreground">
            <span>{contextCopy.description}</span>
            {entityName ? (
              <span className="block font-medium text-foreground">
                {entityName}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Satisfaction rating
            </Label>
            <div className="flex items-center gap-2">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    rating === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/70 hover:text-foreground",
                  )}
                  onClick={() => setRating(option)}
                  aria-pressed={rating === option}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{ratingCaption}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csat-comment" className="text-sm font-medium">
              {contextCopy.followUp}
            </Label>
            <Textarea
              id="csat-comment"
              placeholder="Add helpful context for the team (optional)."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={400}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleDialogChange(false)}
            disabled={submitting}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={rating === null || submitting}
          >
            {submitting ? "Sending..." : "Share feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
