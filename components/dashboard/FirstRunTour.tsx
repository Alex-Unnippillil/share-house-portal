"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Joyride, { CallBackProps, EVENTS, STATUS, Step } from "react-joyride"

import { useAuth } from "@/hooks/use-auth"
import useSupabaseBrowser from "@/utils/supabase-browser"

export const DASHBOARD_TOUR_STORAGE_KEY = "roomsily.dashboard.first-run-tour"
export const DASHBOARD_TOUR_EVENT = "dashboard-tour:reopen"

const TOUR_IDENTIFIER = "dashboard_first_run"

const TOUR_STEPS: Step[] = [
  {
    target: "[data-tour-id='dashboard-welcome']",
    title: "Welcome home",
    content:
      "Your dashboard opens with a quick summary of upcoming tasks and household status.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: "[data-tour-id='dashboard-metrics']",
    title: "Track household health",
    content:
      "Keep an eye on rent, maintenance, and community metrics to understand what needs attention.",
    placement: "bottom",
  },
  {
    target: "[data-tour-id='dashboard-quick-actions']",
    title: "Jump into key workflows",
    content:
      "Use quick actions to record payments, reserve amenities, or register visitors in seconds.",
    placement: "bottom",
  },
  {
    target: "[data-tour-id='dashboard-next-rent']",
    title: "Stay ahead on rent",
    content:
      "Track the next amount due, autopay status, and any outstanding balance for your unit.",
    placement: "bottom",
  },
  {
    target: "[data-tour-id='dashboard-roommate-board']",
    title: "Coordinate with roommates",
    content:
      "Catch up on household updates and reply without leaving the dashboard.",
    placement: "top",
  },
  {
    target: "[data-tour-id='dashboard-help-menu']",
    title: "Need a refresher?",
    content:
      "You can reopen this walkthrough or reach support anytime from the Help menu.",
    placement: "left",
  },
]

export function useDashboardTourControls() {
  const reopenTour = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    window.dispatchEvent(new CustomEvent(DASHBOARD_TOUR_EVENT))
  }, [])

  const clearCompletion = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.removeItem(DASHBOARD_TOUR_STORAGE_KEY)
    } catch (error) {
      console.error("Failed to clear dashboard tour completion", error)
    }
  }, [])

  return useMemo(
    () => ({
      reopenTour,
      clearCompletion,
    }),
    [clearCompletion, reopenTour],
  )
}

export default function FirstRunTour() {
  const supabase = useSupabaseBrowser()
  const { user } = useAuth()

  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const completionPersistedRef = useRef(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return
    }

    let completed = false
    try {
      completed =
        window.localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY) === "completed"
    } catch (error) {
      console.error("Failed to read dashboard tour completion", error)
    }

    if (!completed) {
      setRun(true)
    }
  }, [isMounted])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return
    }

    const handleReopen = () => {
      completionPersistedRef.current = false
      setStepIndex(0)
      setRun(true)
    }

    window.addEventListener(DASHBOARD_TOUR_EVENT, handleReopen)

    return () => {
      window.removeEventListener(DASHBOARD_TOUR_EVENT, handleReopen)
    }
  }, [isMounted])

  const persistCompletion = useCallback(async () => {
    if (completionPersistedRef.current) {
      return
    }
    completionPersistedRef.current = true

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DASHBOARD_TOUR_STORAGE_KEY, "completed")
      } catch (error) {
        console.error("Failed to persist dashboard tour completion", error)
      }
    }

    if (!user?.id) {
      return
    }

    try {
      const payload = {
        user_id: user.id,
        tour: TOUR_IDENTIFIER,
        completed_at: new Date().toISOString(),
      }

      await (supabase as unknown as {
        from: (
          table: string,
        ) => {
          upsert: (
            values: Record<string, unknown>,
            options?: Record<string, unknown>,
          ) => Promise<unknown>
        }
      }).from("ui_tour_progress").upsert(payload, {
        onConflict: "user_id,tour",
      })
    } catch (error) {
      console.error("Failed to sync dashboard tour completion to Supabase", error)
    }
  }, [supabase, user?.id])

  const handleJoyrideCallback = useCallback(
    async ({ status, type, index }: CallBackProps) => {
      if (typeof index === "number") {
        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
          setStepIndex(index + 1)
        }
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false)
        setStepIndex(0)
        await persistCompletion()
      }
    },
    [persistCompletion],
  )

  if (!isMounted) {
    return null
  }

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose={false}
      disableCloseOnEsc={false}
      hideBackButton
      spotlightClicks
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: "#ffffff",
          backgroundColor: "#0f172a",
          overlayColor: "rgba(15, 23, 42, 0.45)",
          primaryColor: "#2563eb",
          textColor: "#f8fafc",
          zIndex: 30,
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
      floaterProps={{
        styles: {
          arrow: {
            color: "#0f172a",
          },
        },
      }}
    />
  )
}
