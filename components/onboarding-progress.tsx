import SmartLink from "@/components/navigation/SmartLink"
import { cn } from "@/lib/utils"

const ONBOARDING_STEPS = [1, 2, 3, 4]

export default function OnboardingProgress({ step = 1 }: { step?: number }) {
  return (
    <div className="px-4 pb-8 pt-12">
      <div className="mx-auto w-full max-w-md">
        <div className="relative">
          <div
            className="absolute left-0 top-1/2 -mt-px h-0.5 w-full bg-border"
            aria-hidden="true"
          ></div>
          <ul className="relative flex w-full justify-between">
            {ONBOARDING_STEPS.map((stepNumber) => {
              const isCompleteOrCurrent = step >= stepNumber

              return (
                <li key={stepNumber}>
                  <SmartLink
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      isCompleteOrCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                    href={`/signup?=page${stepNumber}`}
                    intent="navigation"
                  >
                    {stepNumber}
                  </SmartLink>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
