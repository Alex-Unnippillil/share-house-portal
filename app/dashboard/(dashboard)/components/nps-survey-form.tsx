"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { track } from "@vercel/analytics/react"

import { submitNpsResponse } from "@/app/feedback/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const SCORES = Array.from({ length: 11 }, (_, index) => index)

type NpsSurveyFormProps = {
  period: string
  periodLabel: string
  window: {
    start: string
    end: string
  }
}

export function NpsSurveyForm({ period, periodLabel, window }: NpsSurveyFormProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    track('nps_survey_shown', { period })
  }, [period])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    [],
  )

  if (dismissed) {
    return null
  }

  const formattedWindow = `${dateFormatter.format(new Date(window.start))} – ${dateFormatter.format(new Date(window.end))}`

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score)
    setError(null)
    track('nps_score_selected', { period, score })
  }

  const handleSubmit = () => {
    if (selectedScore === null) {
      setError('Please choose a score to continue.')
      return
    }

    startTransition(async () => {
      const result = await submitNpsResponse({
        score: selectedScore,
        comment: comment.trim() ? comment.trim() : undefined,
      })

      if (result?.error) {
        setError(result.error)
        track('nps_submission_failed', { period, score: selectedScore })
        return
      }

      setSubmitted(true)
      track('nps_submission_completed', {
        period,
        score: selectedScore,
        commentLength: comment.trim().length,
      })
      toast({
        title: 'Thanks for the feedback! 💛',
        description: 'We share every response with the product team.',
      })
    })
  }

  const handleDismiss = (reason: 'skip' | 'complete') => {
    if (reason === 'skip') {
      track('nps_survey_dismissed', { period, reason })
    }

    setDismissed(true)
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Quarterly check-in</CardTitle>
            <CardDescription>
              How likely are you to recommend Share House Portal to a friend? This survey resets each
              quarter ({periodLabel}, {formattedWindow}).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleDismiss('skip')}
          >
            Maybe later
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SCORES.map((score) => (
            <Button
              key={score}
              type="button"
              variant={selectedScore === score ? 'default' : 'outline'}
              size="sm"
              disabled={isPending || submitted}
              onClick={() => handleScoreSelect(score)}
              className={cn(
                'size-10 rounded-full border-2 font-semibold transition-colors',
                score <= 6 && 'border-destructive/50 text-destructive hover:bg-destructive/90 hover:text-destructive-foreground',
                score >= 9 && 'border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white',
              )}
              aria-label={`Score ${score}`}
            >
              {score}
            </Button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Optional: What’s the biggest reason for your score?"
          disabled={isPending || submitted}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4">
        {submitted ? (
          <>
            <p className="text-sm text-muted-foreground">We appreciate you taking the time to help us improve.</p>
            <Button type="button" onClick={() => handleDismiss('complete')}>
              Close
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">0 = Not at all likely, 10 = Extremely likely</p>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              Submit
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
