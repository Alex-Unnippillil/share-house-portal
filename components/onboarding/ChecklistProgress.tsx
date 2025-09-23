"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  EMPTY_ONBOARDING_STEPS_STATE,
  ONBOARDING_PROGRESS_EVENT,
  ONBOARDING_STEPS,
  OnboardingStepsState,
  computeOnboardingCompletion,
  getChecklistStateFromProfile,
} from "@/lib/onboarding/steps"
import type { Database } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase-browser"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

async function fetchProfileProgress(
  supabase: ReturnType<typeof createClient>,
): Promise<{ state: OnboardingStepsState; error?: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return {
      state: { ...EMPTY_ONBOARDING_STEPS_STATE },
      error: "Unable to load your profile. Please try again.",
    }
  }

  if (!user) {
    return {
      state: { ...EMPTY_ONBOARDING_STEPS_STATE },
      error: "Sign in to see your onboarding progress.",
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("unit_id, rent_share, metadata, onboarding_steps")
    .eq("id", user.id)
    .single()

  if (error) {
    return {
      state: { ...EMPTY_ONBOARDING_STEPS_STATE },
      error: "We couldn't fetch your onboarding progress.",
    }
  }

  return {
    state: getChecklistStateFromProfile(data as ProfileRow),
  }
}

export default function ChecklistProgress() {
  const [steps, setSteps] = useState<OnboardingStepsState>(
    EMPTY_ONBOARDING_STEPS_STATE,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const load = async () => {
      setLoading(true)
      const result = await fetchProfileProgress(supabase)
      if (!isMounted) {
        return
      }
      setSteps(result.state)
      setError(result.error ?? null)
      setLoading(false)
    }

    void load()

    const handleRefresh = () => {
      void load()
    }

    window.addEventListener(ONBOARDING_PROGRESS_EVENT, handleRefresh)

    return () => {
      isMounted = false
      window.removeEventListener(ONBOARDING_PROGRESS_EVENT, handleRefresh)
    }
  }, [])

  const completion = computeOnboardingCompletion(steps)
  const allComplete = completion.total > 0 && completion.completed === completion.total

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Onboarding checklist</h2>
          <p className="text-sm text-muted-foreground">
            Track the setup tasks your property manager needs before move-in day.
          </p>
        </div>
        {allComplete ? (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600">
            Complete
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-primary/5 text-primary">
            {completion.completed} / {completion.total}
          </Badge>
        )}
      </header>

      <div className="mt-5 space-y-2">
        <Progress value={completion.percentage} aria-label="Onboarding progress" />
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading your progress..."
            : `${completion.completed} of ${completion.total} steps complete`}
        </p>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      <ul className="mt-6 space-y-3">
        {ONBOARDING_STEPS.map((step) => {
          const complete = steps[step.key]

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3",
                complete
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-border bg-background",
              )}
            >
              {complete ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {allComplete && !error && !loading ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          All onboarding steps complete. You're ready for move-in!
        </div>
      ) : null}
    </section>
  )
}
