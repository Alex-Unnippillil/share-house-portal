"use client"

import { useEffect, useState } from "react"
import { track } from "@vercel/analytics/react"

import { recordCsatResponse } from "@/app/feedback/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

const RATINGS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
] as const

type CsatPromptProps = {
  flow: string
  onDismiss?: () => void
}

export function CsatPrompt({ flow, onDismiss }: CsatPromptProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    track('csat_prompt_viewed', { flow })
  }, [flow])

  const handleDismiss = (reason: 'skip' | 'complete') => {
    if (reason === 'skip') {
      track('csat_prompt_skipped', { flow })
    }

    onDismiss?.()
  }

  const handleSubmit = async () => {
    if (!rating) {
      return
    }

    setIsSubmitting(true)
    const trimmedComment = comment.trim()

    try {
      const result = await recordCsatResponse({
        flow,
        rating,
        comment: trimmedComment ? trimmedComment : undefined,
      })

      if (result?.error) {
        toast({
          title: "We couldn't save that",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      setSubmitted(true)
      track('csat_response_submitted', {
        flow,
        rating,
        commentLength: trimmedComment.length,
      })
      toast({
        title: "Thanks for the quick rating!",
        description: "We read every response to keep the experience smooth.",
      })
    } catch (error) {
      console.error('Failed to submit CSAT response', error)
      toast({
        title: "Submission failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-muted bg-muted/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>How did that go?</CardTitle>
            <CardDescription>Rate this experience on a five-point scale.</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => handleDismiss('skip')}>
            Skip
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {RATINGS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={rating === option.value ? 'default' : 'outline'}
              size="sm"
              disabled={isSubmitting || submitted}
              onClick={() => {
                setRating(option.value)
                track('csat_rating_selected', { flow, rating: option.value })
              }}
              aria-label={`Rate ${option.value} out of 5`}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">1 = Very dissatisfied · 5 = Very satisfied</p>
          {!showComment && !submitted ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowComment(true)}>
              Add comment
            </Button>
          ) : null}
        </div>
        {showComment || comment ? (
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional: what could we improve?"
            disabled={isSubmitting || submitted}
          />
        ) : null}
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-2">
        {submitted ? (
          <Button type="button" onClick={() => handleDismiss('complete')}>
            Close
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={!rating || isSubmitting}>
            Share feedback
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
