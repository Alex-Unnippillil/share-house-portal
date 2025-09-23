import { Metadata } from "next"
import { redirect } from "next/navigation"

import OnboardingFlow from "./_components/onboarding-flow"
import { getOnboardingProgress } from "./actions"
import { createSupbaseServerClient } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Roomsily household onboarding",
}

export default async function OnboardingPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data, error } = await getOnboardingProgress(user.id)

  if (error || !data) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Tenant onboarding
          </h1>
          <p className="text-muted-foreground">
            We couldn&apos;t load your onboarding checklist right now. Please
            refresh the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Finish setting up your household
          </h1>
          <p className="text-muted-foreground">
            Work through the required steps below to unlock the full Share
            House Portal experience.
          </p>
        </div>
        <OnboardingFlow initialProgress={data} />
      </div>
    </div>
  )
}
