"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import { useRouter } from "next/navigation"

import { track } from "@vercel/analytics/react"

import { recordNpsResponse } from "@/lib/data/surveys"
import { formatQuarterLabel, type QuarterWindow } from "@/lib/surveys"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase-browser"

const SCORES = Array.from({ length: 11 }, (_, index) => index)

interface ScoreDescriptor {
  headline: string
  helper: string
  className: string
}

function describeScore(score: number | null): ScoreDescriptor {
  if (score === null) {
    return {
      headline: "Select a score to continue",
      helper: "0 = not likely, 10 = extremely likely",
      className: "text-muted-foreground",
    }
  }

  if (score <= 6) {
    return {
      headline: "We want to do better",
      helper: "Tell us what felt off so we can fix it quickly.",
      className: "text-destructive",
    }
  }

  if (score <= 8) {
    return {
      headline: "Almost there",
      helper: "What would earn us a 9 or 10 next quarter?",
      className: "text-amber-600 dark:text-amber-500",
    }
  }

  return {
    headline: "Thanks for the love!",
    helper: "Share what stood out so we can keep doing it.",
    className: "text-emerald-600 dark:text-emerald-400",
  }
}

function formatDateLabel(isoDate: string | null): string | null {
  if (!isoDate) {
    return null
  }

  const parsed = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

export interface QuarterlyNpsSurveyProps {
  quarter: QuarterWindow
  lastCompletedQuarterStart: string | null
  className?: string
}

export function QuarterlyNpsSurvey({
  quarter,
  lastCompletedQuarterStart,
  className,
}: QuarterlyNpsSurveyProps) {
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const descriptor = useMemo(() => describeScore(score), [score])
  const lastCompletedLabel = useMemo(
    () => formatDateLabel(lastCompletedQuarterStart),
    [lastCompletedQuarterStart]
  )
  const promptTrackedRef = useRef(false)

  useEffect(() => {
    if (!promptTrackedRef.current) {
      track("survey_nps_prompted", {
        quarter: quarter.quarter,
        year: quarter.year,
        last_completed_quarter_start: lastCompletedQuarterStart,
      })
      promptTrackedRef.current = true
    }
  }, [quarter.quarter, quarter.year, lastCompletedQuarterStart])

  if (dismissed) {
    return null
  }

  const quarterLabel = formatQuarterLabel(quarter)

  const handleDismiss = (reason: "skip" | "completed") => {
    track("survey_nps_dismissed", {
      reason,
      quarter: quarter.quarter,
      year: quarter.year,
    })
    setDismissed(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (score === null) {
      toast({
        title: "Choose a score",
        description: "Please select how likely you are to recommend us before submitting.",
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

      await recordNpsResponse({
        client: supabase,
        userId: user.id,
        score,
        feedback,
        quarter,
        metadata: {
          surface: "dashboard_quarterly_prompt",
          last_completed_quarter_start: lastCompletedQuarterStart,
        },
      })

      track("survey_nps_submitted", {
        score,
        quarter: quarter.quarter,
        year: quarter.year,
      })

      toast({
        title: "Thanks for the feedback!",
        description: "We appreciate you taking a moment to help shape the roadmap.",
      })

      handleDismiss("completed")
      router.refresh()
    } catch (error) {
      console.error("Error submitting NPS response", error)
      toast({
        title: "We couldn’t save your score",
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn("border-primary/40 shadow-sm", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Quarterly check-in</CardTitle>
            <CardDescription>
              How likely are you to recommend Share House Portal this {quarterLabel}?
            </CardDescription>
            {lastCompletedLabel ? (
              <p className="text-xs text-muted-foreground">
                Last response recorded on {lastCompletedLabel}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleDismiss("skip")}
          >
            Remind me later
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {SCORES.map((value) => (
                <Button
                  type="button"
                  key={value}
                  variant={value === score ? "default" : "outline"}
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 — Not likely</span>
              <span>10 — Extremely likely</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className={cn("text-sm font-medium", descriptor.className)}>
              {descriptor.headline}
            </p>
            <p className="text-xs text-muted-foreground">{descriptor.helper}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="nps-feedback" className="text-sm font-medium text-foreground">
              Any details to share? (optional)
            </label>
            <Textarea
              id="nps-feedback"
              placeholder="Tell us about a recent win or something we should improve."
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Submit"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
