"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"

type OnboardingProgressStep = {
  id: number
  label: string
  complete?: boolean
  locked?: boolean
}

const DEFAULT_STEPS: OnboardingProgressStep[] = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Unit" },
  { id: 3, label: "Rent" },
  { id: 4, label: "Emergency" },
  { id: 5, label: "Vehicle" },
  { id: 6, label: "Review" },
]

function getActiveStep(raw: string | null, maxStep: number) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(Math.max(1, Math.floor(parsed)), maxStep)
}

export default function OnboardingProgress({ steps = DEFAULT_STEPS }: { steps?: OnboardingProgressStep[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeStep = useMemo(() => getActiveStep(searchParams.get("step"), steps.length), [searchParams, steps.length])

  return (
    <nav aria-label="Onboarding steps" className="w-full">
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {steps.map((step) => {
          const isCurrent = step.id === activeStep
          const isComplete = Boolean(step.complete) || step.id < activeStep
          const href = pathname?.startsWith("/onboarding") ? `${pathname}?step=${step.id}` : `/onboarding?step=${step.id}`

          return (
            <li key={step.id}>
              <SmartLink
                href={href}
                intent="navigation"
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={step.locked ? "true" : undefined}
                className={`relative flex items-center gap-2 overflow-hidden rounded-md border px-2 py-1.5 text-xs transition sm:flex-col sm:items-start ${
                  isCurrent
                    ? "border-primary bg-primary/10 text-primary"
                    : isComplete
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border text-muted-foreground"
                } ${step.locked ? "pointer-events-none opacity-60" : ""}`}
              >
                {isCurrent ? (
                  <motion.span
                    layoutId="active-onboarding-step"
                    className="absolute inset-0 rounded-md bg-primary/5"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span
                  className={`relative inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id}
                </span>
                <span className="relative truncate">{step.label}</span>
              </SmartLink>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
