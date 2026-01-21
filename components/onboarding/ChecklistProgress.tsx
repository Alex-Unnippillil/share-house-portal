"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Circle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/utils/supabase-browser"
import type { Tables } from "@/lib/supabase"
import {
  DEFAULT_STEP_STATE,
  ONBOARDING_STEPS,
  calculateCompletion,
  deriveStepStateFromProfile,
  type OnboardingStepState,
} from "@/app/onboarding/progress"

const HAS_SUPABASE_CONFIGURATION = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

type ProfileProgressFields = Pick<
  Tables<"profiles">,
  "unit_id" | "rent_share" | "onboarding_steps" | "emergency_contacts" | "metadata"

export function ChecklistProgress() {
  const [stepState, setStepState] = useState<OnboardingStepState>(DEFAULT_STEP_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadProgress() {
      if (!HAS_SUPABASE_CONFIGURATION) {
        if (isMounted) {
          setError("Supabase configuration is missing. Progress will resume once it's restored.")
          setIsLoading(false)
        }
        return
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          if (isMounted) {
            setError("Sign in to view your onboarding progress.")
            setIsLoading(false)
          }
          return
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("unit_id, rent_share, onboarding_steps, emergency_contacts, metadata")
          .eq("id", user.id)
          .single<ProfileProgressFields>()

        if (profileError) {
          throw profileError
        }

        if (isMounted) {
          const derivedState = deriveStepStateFromProfile(data)
          setStepState(derivedState)
          setError(null)
        }
      } catch (fetchError) {
        console.error("Failed to load onboarding progress", fetchError)
        if (isMounted) {
          setError("We couldn't load your onboarding progress. Please try again.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProgress()

    return () => {
      isMounted = false
    }
  }, [])

  const completion = useMemo(() => calculateCompletion(stepState), [stepState])

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Onboarding checklist</CardTitle>
        <CardDescription>
          {error
            ? error
            : isLoading
              ? "Loading your progress..."
              : "Complete each task to unlock the full roommate portal experience."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between text-sm font-medium">
            <span>
              {completion.completed} of {completion.total} complete
            </span>
            <span>{completion.percent}%</span>
          </div>
          <Progress value={completion.percent} className="mt-2" />
        </div>
        <ul className="space-y-4">
          {ONBOARDING_STEPS.map((step) => {
            const isComplete = stepState[step.key]
            return (
              <li
                key={step.key}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <div
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border ${isComplete ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"}`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium leading-none">{step.title}</p>
                    <Badge variant={isComplete ? "complete" : "outline"}>
                      {isComplete ? "Completed" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
